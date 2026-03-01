# ♞ Knight's Eye · Free Chess Game Analyzer

**Live Site:** [knightseye.netlify.app](https://knightseye.netlify.app/)

A completely **free, open-source** chess game analyzer and AI coach. Paste any PGN and get instant deep analysis — no sign-up, no subscription, no ads.

## ✨ Features

- **⚡ Parallel Stockfish Engine** — Up to 4 simultaneous engine threads for fast analysis
- **🎯 Move Classification** — Brilliant, Best, Excellent, Good, Inaccuracy, Mistake, Blunder
- **📊 Accuracy Scores** — White and Black accuracy percentages
- **🏹 Tactical Arrows** — Visual arrows showing played move vs engine best
- **🤖 AI Coach Mode** — Optional local LLM (WebLLM/WebGPU, ~1GB one-time download)
- **⚡ Basic Coach Mode** — Instant Stockfish-powered coaching with no download
- **📈 Eval Chart** — Visual evaluation graph with clickable navigation
- **🔊 Voice Narration** — Text-to-speech for coaching and move announcements
- **♟ PGN Export** — Export annotated PGN with eval comments

## 🚀 Getting Started

### Option 1: Use Online
Visit **[knightseye.netlify.app](https://knightseye.netlify.app/)** — no installation needed.

### Option 2: Run Locally
```bash
git clone https://github.com/shreyash1080/KnightsEye.git
cd KnightsEye
# Serve with any static server, e.g.:
npx serve .
# or
python3 -m http.server 8080
```
Open `http://localhost:8080`

## 📁 Project Structure

```
KnightsEye/
├── index.html          # Main HTML (semantic, SEO-optimised)
├── css/
│   └── style.css       # All styles
├── js/
│   ├── state.js        # Global state & constants
│   ├── ui.js           # UI helpers (loading, modals, tabs)
│   ├── engine.js       # Stockfish worker pool & analysis
│   ├── board.js        # Chess board rendering & arrows
│   ├── navigation.js   # Move navigation & right panel
│   ├── settings.js     # Settings modal & voice
│   ├── coach.js        # AI coaching logic
│   ├── app.js          # Main app init & game processing
│   └── webllm.js       # WebLLM ES module (AI Coach Mode)
├── assets/             # Images, og-image, favicon
├── netlify.toml        # Netlify deploy config + headers
├── LICENSE             # MIT + third-party notices
└── README.md
```

## ⚖️ Stockfish License Compliance

This project uses **Stockfish** via CDN under the **GNU GPLv3** license.

- Stockfish source: https://github.com/official-stockfish/Stockfish
- Stockfish.js wrapper: https://github.com/nmrugg/stockfish.js
- Knight's Eye does **not modify** Stockfish in any way
- The complete Stockfish source code is available at the above links as required by GPLv3

## 🛠 Tech Stack

| Tool | Purpose | License |
|------|---------|---------|
| [Stockfish.js](https://github.com/nmrugg/stockfish.js) | Chess engine analysis | GPLv3 |
| [Chess.js](https://github.com/jhlywa/chess.js) | PGN parsing & move validation | BSD-2 |
| [WebLLM](https://github.com/mlc-ai/web-llm) | Local AI coach (optional) | Apache 2.0 |
| Vanilla JS/CSS | UI | MIT |

## 🤝 Contributing

PRs welcome! Please open an issue first for major changes.

## 📄 License

MIT — see [LICENSE](LICENSE). Third-party licenses noted therein.
