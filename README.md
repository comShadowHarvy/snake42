# Snake42 AI - Multi-AI Snake Battle Royale 🐍⚔️

[![Play Online](https://img.shields.io/badge/Play%20Online-GitHub%20Pages-00d4ff?style=for-the-badge&logo=github)](https://comshadowharvy.github.io/snake42/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

An enhanced **Multi-AI Snake Battle Royale** game built for both modern web browsers and desktop (Electron). Compete in real-time against intelligent AI snakes equipped with A* pathfinding, BFS flood-fill trap prevention, and unique personalities!

---

## 🌐 Play Directly on GitHub Pages

Play the game instantly in your browser:
### 🎮 **[https://comshadowharvy.github.io/snake42/](https://comshadowharvy.github.io/snake42/)**

---

## ✨ Features & Enhancements

- 🤖 **Smart Multi-AI Competitors**:
  - **Aggressive (Red)**: Direct food hunter & player challenger.
  - **Defensive (Green)**: Cautious open-space survival loop expert.
  - **Strategic (Orange)**: Interceptor pathfinder & power-up collector.
  - **Greedy (Purple)**: Hyper-fixated on rare power-ups & score multipliers.
- 🛡️ **Flood-Fill Trap Prevention**: AI evaluates open space before every move to prevent trapping itself in dead ends or within snake bodies.
- ⚡ **5 Dynamic Power-Up Orbs**:
  - **⚡ Speed Boost**: Double speed for 5 seconds.
  - **🛡️ Shield Aura**: Protects snake from 1 fatal collision.
  - **🧪 Shrink Orb**: Reduces tail length by 3 segments.
  - **🌟 Double Score**: 2x points for 8 seconds.
  - **❄️ Freeze AI**: Temporarily freezes competitor AI snakes for 4 seconds.
- 🔊 **Zero-Dependency Web Audio Synthesizer**: Retro arcade sound effects (food chime, power-up arpeggio, crash burst, game over tune) with in-HUD mute controls.
- 🏆 **Local High Scores Leaderboard**: Persistent high-score recording with player name entry.
- 📱 **Mobile & Tablet Friendly**: Integrated Virtual On-Screen D-Pad and touch controls.
- 💻 **Dual Target Runtime**: Runs natively in any Web Browser and inside Electron Desktop.

---

## 🎮 How to Play & Controls

### Keyboard Controls
| Action | Key(s) |
|---|---|
| Move Up | <kbd>W</kbd> or <kbd>↑</kbd> |
| Move Down | <kbd>S</kbd> or <kbd>↓</kbd> |
| Move Left | <kbd>A</kbd> or <kbd>←</kbd> |
| Move Right | <kbd>D</kbd> or <kbd>→</kbd> |
| Pause / Resume | <kbd>Space</kbd> |
| Main Menu | <kbd>Esc</kbd> |

### Touch / Mobile Controls
- Use the on-screen **Virtual D-Pad** buttons on mobile and tablet screens.

---

## 🚀 Local Quickstart & Development

### 1. Clone the repository
```bash
git clone https://github.com/comShadowHarvy/snake42.git
cd snake42
```

### 2. Run Local Web Server
```bash
npm run serve
```
Open [http://localhost:8042](http://localhost:8042) in your browser.

### 3. Run Desktop Electron App
```bash
npm install
npm start
```

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
