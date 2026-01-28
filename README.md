# TopSpin 🎵

A sleek macOS menu bar application for running your favorite web apps (PWAs) in a dedicated, always-accessible window.

![macOS](https://img.shields.io/badge/macOS-Sequoia%2015.2-blue)
![Electron](https://img.shields.io/badge/Electron-40.0.0-47848F)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

- **Menu Bar Native**: Lives in your menu bar for instant access. Click the icon to toggle the app.
- **Tabbed Interface**: Run multiple PWAs (YouTube Music, Gemini, ChatGPT, etc.) in separate tabs.
- **Background Audio Playback**: Music keeps playing when the app is hidden or you switch to other apps.
- **Google Login Support**: Seamless sign-in to Google services with enhanced stealth mode.
- **Full Screen Overlay**: Use the app over full-screen windows without switching desktops.
- **Custom User Agent**: Switch between Mobile (iPhone) and Desktop views.
- **Launch at Login**: Optionally start the app when you log into your Mac.

## 📸 Screenshots

*Coming soon!*

## 🚀 Installation

### Option 1: Download Release (Recommended)
1. Download the latest `.dmg` from the [Releases](https://github.com/YOUR_USERNAME/TopSpin/releases) page.
2. Open the `.dmg` and drag **TopSpin** to your Applications folder.
3. Launch TopSpin from Applications.

### Option 2: Build from Source
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/TopSpin.git
cd TopSpin

# Install dependencies
npm install

# Run in development mode
npm start

# Build for production
npm run dist
```

The built app will be in the `dist/` folder.

## 🎛️ Usage

1. **Click the menu bar icon** to open/close the app.
2. **Switch tabs** by clicking the tab buttons at the top.
3. **Add a new app** by clicking the **+** button.
4. **Remove an app** by right-clicking its tab.
5. **Access settings** via the ⚙️ icon:
   - Change User Agent (Mobile/Desktop)
   - Enable Launch at Login
   - Quit the app

### 🔐 Signing into Google

TopSpin includes a special secure login flow for Google accounts:
- When you click "Sign in" on a Google service, a dedicated login window opens.
- This window uses enhanced stealth mode to pass Google's security checks.
- Once logged in, close the popup and the main app will refresh with your session.

## 🛠️ Tech Stack

- **Electron 40** - Cross-platform desktop framework
- **HTML/CSS/JavaScript** - UI
- **electron-builder** - Packaging and distribution

## 📁 Project Structure

```
MenuBarPWA/
├── index.js           # Main process (Electron)
├── index.html         # App UI structure
├── renderer.js        # Renderer process logic
├── style.css          # Styling
├── iconTemplate@2x.png # Menu bar icon
├── package.json       # Project config
└── dist/              # Built app (after npm run dist)
```

## ⚙️ Configuration

### Default Apps
Edit the `apps` array in `renderer.js` to change the default PWAs:
```javascript
let apps = JSON.parse(localStorage.getItem('apps')) || [
    { name: 'Gemini', url: 'https://gemini.google.com' },
    { name: 'YT Music', url: 'https://music.youtube.com' }
];
```

### User Agent
The default User Agent mimics an iPhone for better compatibility with mobile-optimized sites. You can change this in Settings.

## 🐛 Known Issues

- **Code Signing**: The app is ad-hoc signed. macOS may show a warning on first launch. Right-click → Open to bypass.
- **Notarization**: Not implemented. For distribution outside personal use, you'll need an Apple Developer account.

## 📝 License

MIT License. See [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- Inspired by the need for a lightweight YouTube Music player on macOS

---

Made with ❤️ by Royyan
