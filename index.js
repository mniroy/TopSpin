const { app, BrowserWindow, Tray, screen, ipcMain, powerSaveBlocker } = require('electron');
const path = require('path');

let tray = null;
let window = null;
let psbId = null;

// Disable background throttling and occlusion tracking to keep music playing
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-features', 'OcclusionTracker,CalculateNativeWindowOcclusion');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled'); // CRITICAL: Hides "controlled by automation" flag

// Don't show the app in the dock
if (process.platform === 'darwin') {
  app.dock.hide();
}

// Prevent the app from being napped/suspended by macOS
app.on('ready', () => {
  psbId = powerSaveBlocker.start('prevent-app-suspension');
  createTray();
  createWindow();
});

// Settings / Utilities
ipcMain.on('quit-app', () => {
  app.quit();
});

ipcMain.on('set-login-item', (event, value) => {
  // Only works when app is packaged and installed
  if (app.isPackaged) {
    try {
      app.setLoginItemSettings({
        openAtLogin: value,
        path: app.getPath('exe'),
      });
    } catch (e) {
      console.warn('Could not set login item');
    }
  }
});

ipcMain.handle('get-login-item', () => {
  if (app.isPackaged) {
    try {
      return app.getLoginItemSettings().openAtLogin;
    } catch (e) {
      return false;
    }
  }
  return false;
});

const createTray = () => {
  const iconPath = path.join(__dirname, 'iconTemplate@2x.png');
  const fs = require('fs');

  try {
    // Check if icon exists, if not use a generic one or just a placeholder string
    if (fs.existsSync(iconPath)) {
      tray = new Tray(iconPath);
    } else {
      // Create a temporary tray even without icon to avoid total failure
      // On macOS, we can't easily create an empty tray, but we can log it.
      console.warn('Icon not found at:', iconPath);
      // We still try to create it, Electron might show a default or empty space
      tray = new Tray(iconPath);
    }

    tray.setToolTip('TopSpin');

    tray.on('click', (event, bounds) => {
      toggleWindow();
    });
  } catch (err) {
    console.error('Failed to create tray:', err);
  }
};

const createWindow = () => {
  window = new BrowserWindow({
    width: 400,
    height: 600,
    show: false,
    frame: false,
    fullscreenable: false,
    resizable: true,
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
      backgroundThrottling: false,
      disableBlinkFeatures: 'Auxclick',
      webSecurity: false, // Sometimes required for specialized login flows
      allowRunningInsecureContent: true
    }
  });

  // STRIP IDENTITY: Remove headers that identify this as "TopSpin/Electron"
  const { session } = window.webContents;

  window.loadFile('index.html');

  // Allow the app to float over Full Screen apps
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  window.setAlwaysOnTop(true, 'floating');

  // CRITICAL: Hide via opacity (not hide()) to keep audio playing
  window.on('blur', () => {
    if (!window.webContents.isDevToolsOpened()) {
      window.setOpacity(0);
      window.setIgnoreMouseEvents(true);
    }
  });
};

// DEDICATED LOGIN WINDOW (Enhanced Mobile Stealth)
ipcMain.handle('google-login', () => {
  return new Promise((resolve) => {
    const loginWin = new BrowserWindow({
      width: 375,
      height: 812,
      resizable: false,
      webPreferences: {
        partition: 'persist:topspin',
        nodeIntegration: false,
        contextIsolation: true,
        safeDialogs: true,
        devTools: false
      }
    });

    const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1';
    loginWin.webContents.setUserAgent(MOBILE_UA);

    loginWin.webContents.on('dom-ready', () => {
      loginWin.webContents.executeJavaScript(`
          try {
              delete window.chrome;
              Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
          } catch (e) {}
      `);
    });

    const { session } = loginWin.webContents;
    session.webRequest.onBeforeSendHeaders(
      { urls: ['*://*.google.com/*'] },
      (details, callback) => {
        delete details.requestHeaders['Sec-CH-UA'];
        delete details.requestHeaders['Sec-CH-UA-Mobile'];
        delete details.requestHeaders['Sec-CH-UA-Platform'];
        callback({ cancel: false, requestHeaders: details.requestHeaders });
      }
    );

    loginWin.loadURL('https://accounts.google.com/ServiceLogin');

    loginWin.on('closed', () => {
      resolve();
    });
  });
});

const getWindowPosition = () => {
  const windowBounds = window.getBounds();
  const trayBounds = tray.getBounds();
  const x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));
  const y = Math.round(trayBounds.y + trayBounds.height + 4);
  return { x, y };
};

const toggleWindow = () => {
  // Use opacity to "hide" instead of actual hide, so audio keeps playing
  if (window.getOpacity() === 1) {
    window.setOpacity(0);
    window.setIgnoreMouseEvents(true);
  } else {
    const { x, y } = getWindowPosition();
    window.setPosition(x, y, false);
    window.setOpacity(1);
    window.setIgnoreMouseEvents(false);
    window.show(); // Ensure it's in front
    window.focus();
  }
};

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
