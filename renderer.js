const { ipcRenderer, shell } = require('electron');

const tabsBar = document.getElementById('tabs-bar');
const webviewContainer = document.getElementById('webview-container');
const addAppBtn = document.getElementById('add-app-btn');
const settingsBtn = document.getElementById('settings-btn');
const backBtn = document.getElementById('back-btn');
const reloadBtn = document.getElementById('reload-btn');
const openExternalBtn = document.getElementById('open-external-btn');

// App Modals
const addModal = document.getElementById('add-modal');
const settingsModal = document.getElementById('settings-modal');



// New App Elements
const newAppNameInput = document.getElementById('new-app-name');
const newAppUrlInput = document.getElementById('new-app-url');
const confirmAddBtn = document.getElementById('confirm-add');
const cancelAddBtn = document.getElementById('cancel-add');

// Settings Elements
const uaSelect = document.getElementById('ua-select');
const uaCustomInput = document.getElementById('ua-custom-input');
const loginCheckbox = document.getElementById('login-checkbox');
const saveSettingsBtn = document.getElementById('save-settings');
const closeSettingsBtn = document.getElementById('close-settings');
const quitAppBtn = document.getElementById('quit-app-btn');

const DEFAULT_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1";

let apps = JSON.parse(localStorage.getItem('apps')) || [
    { name: 'Gemini', url: 'https://gemini.google.com' },
    { name: 'YT Music', url: 'https://music.youtube.com' }
];

let currentUserAgent = localStorage.getItem('user-agent') || DEFAULT_UA;
let activeAppIndex = 0;

const saveApps = () => {
    localStorage.setItem('apps', JSON.stringify(apps));
};

const renderTabs = () => {
    tabsBar.innerHTML = '';
    webviewContainer.innerHTML = '';

    apps.forEach((app, index) => {
        // Create Tab Button
        const btn = document.createElement('button');
        btn.className = `tab-btn ${index === activeAppIndex ? 'active' : ''}`;
        btn.textContent = app.name;
        btn.addEventListener('click', () => switchTab(index));

        // Add context menu to delete (right click)
        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (confirm(`Remove ${app.name}?`)) {
                removeApp(index);
            }
        });

        tabsBar.appendChild(btn);

        // Create Webview
        const webview = document.createElement('webview');
        webview.className = `pwa-webview ${index === activeAppIndex ? 'active' : ''}`;
        webview.src = app.url;
        webview.useragent = currentUserAgent;
        webview.id = `webview-${index}`;
        webview.setAttribute('partition', 'persist:topspin');
        webview.setAttribute('allowpopups', '');
        webviewContainer.appendChild(webview);

        handleCrashes(webview);

        // FAKE VISIBILITY: This prevents YT Music from pausing when the window is hidden
        // ... (previous visibility logic preserved via 'dom-ready') ...

        // INTERCEPT GOOGLE LOGIN: The "Sign in" button in the webview will now trigger our secure window
        const handleLoginNavigation = async (url, event) => {
            if (url.includes('accounts.google.com') || url.includes('google.com/signin')) {
                // Determine if we should stop navigation or prevent new window
                if (event && event.preventDefault) event.preventDefault();
                webview.stop(); // Stop the "Insecure Browser" page from loading

                // Open the secure login window and wait for user to close it
                await ipcRenderer.invoke('google-login');

                // Reload the page to refresh the session
                webview.reload();
            }
        };

        webview.addEventListener('will-navigate', (e) => handleLoginNavigation(e.url, e));
        webview.addEventListener('new-window', (e) => handleLoginNavigation(e.url, e));

        webview.addEventListener('dom-ready', () => {
            const currentUrl = webview.getURL();

            // STRICT SAFETY: Do absolutely nothing on Google Login pages to prevent "Secure Browser" errors
            if (currentUrl.includes('accounts.google.com') || currentUrl.includes('google.com/signin')) {
                return;
            }

            // Only apply visibility fix on the actual app pages (like YouTube Music or Gemini)
            webview.executeJavaScript(`
                try {
                    Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: false });
                    Object.defineProperty(document, 'hidden', { value: false, writable: false });
                    
                    // Mock Focus: Tricks app into thinking it's always the active window
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
    if (apps.length <= 1) return alert("You must HAVE at least one app.");
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

// Modals Control
addAppBtn.addEventListener('click', () => addModal.classList.add('active'));
cancelAddBtn.addEventListener('click', () => addModal.classList.remove('active'));

settingsBtn.addEventListener('click', async () => {
    // Determine which option to select
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

// Action buttons
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

    // Reload UI to apply new UA to all webviews
    renderTabs();
    settingsModal.classList.remove('active');
});

quitAppBtn.addEventListener('click', () => {
    ipcRenderer.send('quit-app');
});

// Controls
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

// Initial Render
renderTabs();
