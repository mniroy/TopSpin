# TopSpin

A macOS menu bar application for running your favorite web apps (PWAs) in a dedicated, always-accessible window.

## Features

- **Menu Bar Native**: Lives in your menu bar for instant access. Click the icon to toggle the app.
- **Tabbed Interface**: Run multiple PWAs (YouTube Music, Gemini, ChatGPT, etc.) in separate tabs.
- **Background Audio Playback**: Music keeps playing when the app is hidden or you switch to other apps.
- **Full Screen Overlay**: Use the app over full-screen windows without switching desktops.
- **Custom User Agent**: Switch between Mobile (iPhone) and Desktop views.
- **Launch at Login**: Optionally start the app when you log into your Mac.

## Installation

### Download Release
1. Download the latest `.dmg` from the [Releases](https://github.com/mniroy/TopSpin/releases) page.
2. Open the `.dmg` and drag **TopSpin** to your Applications folder.
3. Launch TopSpin from Applications.

### Build from Source
```bash
# Clone the repository
git clone https://github.com/mniroy/TopSpin.git
cd TopSpin

# Install dependencies
npm install

# Run in development mode
npm start

# Build for production
npm run dist
```

The built app will be in the `dist/` folder.

## Usage

1. Click the menu bar icon to open/close the app.
2. Switch tabs by clicking the tab buttons at the top.
3. Add a new app by clicking the **+** button.
4. Remove an app by right-clicking its tab.
5. Access settings via the gear icon:
   - Change User Agent (Mobile/Desktop)
   - Enable Launch at Login
   - Quit the app

## Tech Stack

- Electron 40
- HTML/CSS/JavaScript
- electron-builder

## Project Structure

```
TopSpin/
├── index.js           # Main process (Electron)
├── index.html         # App UI structure
├── renderer.js        # Renderer process logic
├── style.css          # Styling
├── iconTemplate@2x.png # Menu bar icon
├── package.json       # Project config
└── dist/              # Built app (after npm run dist)
```

## Known Issues

- The app is ad-hoc signed. macOS may show a warning on first launch. Right-click and select Open to bypass.

## License

MIT License. See [LICENSE](LICENSE) for details.

---

Made by Royyan
