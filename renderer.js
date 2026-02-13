const { ipcRenderer, shell } = require('electron');

const tabsBar = document.getElementById('tabs-bar');
const webviewContainer = document.getElementById('webview-container');
const addAppBtn = document.getElementById('add-app-btn');
const settingsBtn = document.getElementById('settings-btn');
const backBtn = document.getElementById('back-btn');
const reloadBtn = document.getElementById('reload-btn');
const openExternalBtn = document.getElementById('open-external-btn');

const addModal = document.getElementById('add-modal');
const settingsModal = document.getElementById('settings-modal');

const newAppNameInput = document.getElementById('new-app-name');
const newAppUrlInput = document.getElementById('new-app-url');
const confirmAddBtn = document.getElementById('confirm-add');
const cancelAddBtn = document.getElementById('cancel-add');

const uaSelect = document.getElementById('ua-select');
const uaCustomInput = document.getElementById('ua-custom-input');
const loginCheckbox = document.getElementById('login-checkbox');
const saveSettingsBtn = document.getElementById('save-settings');
const closeSettingsBtn = document.getElementById('close-settings');
const quitAppBtn = document.getElementById('quit-app-btn');

const DEFAULT_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

let apps = JSON.parse(localStorage.getItem('apps')) || [
    { name: 'Gemini', url: 'https://gemini.google.com' },
    { name: 'YT Music', url: 'https://music.youtube.com' }
];

let currentUserAgent = localStorage.getItem('user-agent') || DEFAULT_UA;

// Force update legacy default UA to new Desktop default
const OLD_DEFAULT_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1";
if (currentUserAgent === OLD_DEFAULT_UA) {
    currentUserAgent = DEFAULT_UA;
    localStorage.setItem('user-agent', DEFAULT_UA);
}
let activeAppIndex = 0;

const saveApps = () => {
    localStorage.setItem('apps', JSON.stringify(apps));
};

const renderTabs = () => {
    tabsBar.innerHTML = '';
    webviewContainer.innerHTML = '';

    apps.forEach((app, index) => {
        const btn = document.createElement('button');
        btn.className = `tab-btn ${index === activeAppIndex ? 'active' : ''}`;
        btn.textContent = app.name;
        btn.addEventListener('click', () => switchTab(index));

        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (confirm(`Remove ${app.name}?`)) {
                removeApp(index);
            }
        });

        tabsBar.appendChild(btn);

        const webview = document.createElement('webview');
        webview.className = `pwa-webview ${index === activeAppIndex ? 'active' : ''}`;
        webview.src = app.url;
        webview.useragent = currentUserAgent;
        webview.id = `webview-${index}`;
        webview.setAttribute('partition', 'persist:topspin');
        webview.setAttribute('allowpopups', '');
        webviewContainer.appendChild(webview);

        handleCrashes(webview);

        const handleNavigation = async (url, event, isNewWindow) => {
            if (url.includes('accounts.google.com') || url.includes('google.com/signin')) {
                if (event && event.preventDefault) event.preventDefault();
                webview.stop();
                await ipcRenderer.invoke('google-login');
                webview.reload();
                return;
            }

            if (isNewWindow) {
                if (event && event.preventDefault) event.preventDefault();
                shell.openExternal(url);
            }
        };

        webview.addEventListener('will-navigate', (e) => handleNavigation(e.url, e, false));
        webview.addEventListener('new-window', (e) => handleNavigation(e.url, e, true));

        webview.addEventListener('dom-ready', () => {
            const currentUrl = webview.getURL();

            if (currentUrl.includes('accounts.google.com') || currentUrl.includes('google.com/signin')) {
                return;
            }

            webview.executeJavaScript(`
                try {
                    Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: false });
                    Object.defineProperty(document, 'hidden', { value: false, writable: false });
                    Object.defineProperty(document, 'hasFocus', { value: () => true, writable: false });
                    window.addEventListener('blur', (e) => e.stopImmediatePropagation(), true);
                    window.addEventListener('visibilitychange', (e) => e.stopImmediatePropagation(), true);
                    window.dispatchEvent(new Event('visibilitychange'));
                    window.dispatchEvent(new Event('focus'));
                } catch (e) {}
            `).catch(() => { });
        });
    });
};

const switchTab = (index) => {
    activeAppIndex = index;
    const tabs = document.querySelectorAll('.tab-btn');
    const webviews = document.querySelectorAll('.pwa-webview');

    tabs.forEach((tab, i) => tab.classList.toggle('active', i === index));
    webviews.forEach((wv, i) => wv.classList.toggle('active', i === index));
};

const removeApp = (index) => {
    if (apps.length <= 1) return alert("You must have at least one app.");
    apps.splice(index, 1);
    if (activeAppIndex >= apps.length) activeAppIndex = apps.length - 1;
    saveApps();
    renderTabs();
};

const handleCrashes = (webview) => {
    webview.addEventListener('render-process-gone', () => {
        console.log('Webview crashed, reloading...');
        webview.reload();
    });
};

addAppBtn.addEventListener('click', () => addModal.classList.add('active'));
cancelAddBtn.addEventListener('click', () => addModal.classList.remove('active'));

settingsBtn.addEventListener('click', async () => {
    let matchedOption = false;
    for (const option of uaSelect.options) {
        if (option.value === currentUserAgent) {
            uaSelect.value = currentUserAgent;
            matchedOption = true;
            break;
        }
    }

    if (!matchedOption) {
        uaSelect.value = "custom";
        uaCustomInput.value = currentUserAgent;
        uaCustomInput.style.display = 'block';
    } else {
        uaCustomInput.style.display = 'none';
    }

    loginCheckbox.checked = await ipcRenderer.invoke('get-login-item');
    settingsModal.classList.add('active');
});

uaSelect.addEventListener('change', () => {
    if (uaSelect.value === 'custom') {
        uaCustomInput.style.display = 'block';
        uaCustomInput.value = currentUserAgent;
    } else {
        uaCustomInput.style.display = 'none';
    }
});

closeSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('active'));

confirmAddBtn.addEventListener('click', () => {
    const name = newAppNameInput.value.trim();
    let url = newAppUrlInput.value.trim();

    if (!name || !url) return alert("Please enter both name and URL");
    if (!url.startsWith('http')) url = 'https://' + url;

    apps.push({ name, url });
    saveApps();
    activeAppIndex = apps.length - 1;
    renderTabs();

    addModal.classList.remove('active');
    newAppNameInput.value = '';
    newAppUrlInput.value = '';
});

saveSettingsBtn.addEventListener('click', () => {
    if (uaSelect.value === 'custom') {
        const newUA = uaCustomInput.value.trim();
        if (newUA) {
            currentUserAgent = newUA;
            localStorage.setItem('user-agent', newUA);
        }
    } else {
        currentUserAgent = uaSelect.value;
        localStorage.setItem('user-agent', currentUserAgent);
    }

    ipcRenderer.send('set-login-item', loginCheckbox.checked);

    renderTabs();
    settingsModal.classList.remove('active');
});

quitAppBtn.addEventListener('click', () => {
    ipcRenderer.send('quit-app');
});

backBtn.addEventListener('click', () => {
    const activeWebview = document.querySelector('.pwa-webview.active');
    if (activeWebview && activeWebview.canGoBack()) {
        activeWebview.goBack();
    }
});

reloadBtn.addEventListener('click', () => {
    const activeWebview = document.querySelector('.pwa-webview.active');
    if (activeWebview) activeWebview.reload();
});

openExternalBtn.addEventListener('click', () => {
    const activeWebview = document.querySelector('.pwa-webview.active');
    if (activeWebview) {
        const url = activeWebview.getURL();
        shell.openExternal(url);
    }
});

renderTabs();
