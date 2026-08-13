# Skyball

Play the deployed game at **https://wussuplee.github.io/Skyball/**.

Skyball is a standalone Y2K/Frutiger Aero-inspired browser game spanning 20 levels. Tilt each suspended circular arena, collect the floating key cube to unlock the receiver, then guide the steel marble around the cut-through holes and reach the open gate before the level timer expires. Level 1 starts at 20 seconds; the later stages tighten toward 14 seconds as their hazard layouts grow denser.

Later levels use an increasingly demanding out-and-back layout: the locked receiver moves back toward the launch point while the key shifts toward the opposite rim, forcing a full-board crossing and return through narrow hazard corridors.

## Run locally

1. Install [Node.js](https://nodejs.org/) version 18 or newer.
2. Unzip the Skyball package.
3. Open the unzipped `Skyball` folder.
4. Right-click an empty area in the folder and choose **Open in Terminal**.
5. Run:

   ```powershell
   npm install
   npm run dev
   ```

6. Open the local address printed in the terminal (normally `http://localhost:5173`).
7. Click **ENTER LEVEL 01**. Use **WASD** or the **arrow keys** to tilt the board. Collect the floating key cube, then enter the glowing receiver. Press **R** or the circular-arrow button to restart. After completing a level, press **Space** to begin the next one.

The bundled soundtrack and rolling recording are located at:

```text
assets/audio/Chrome Drift.mp3
assets/audio/Big Marble Rolling Continuous Sound Effect.mp3
```

The music begins after **ENTER LEVEL 01** is pressed. The bottom-left music button mutes and unmutes it.

## Production build

```powershell
npm run build
npm run preview
```

The deployable website is written to `dist/`. Local builds use relative asset paths. GitHub Actions builds use the `/Skyball/` base path required by the project site.

## GitHub Pages deployment

Every push to `main` runs `.github/workflows/deploy-pages.yml`. The workflow installs dependencies, builds the Vite project, uploads `dist/`, and deploys it through GitHub Pages.

## Global leaderboard setup

Skyball works normally without a backend and continues to save personal bests in the browser. To enable the global All Time and Monthly leaderboards:

1. Create a Supabase project.
2. Open its **SQL Editor**, paste `supabase/schema.sql`, and run it once.
3. In the GitHub Skyball repository, open **Settings → Secrets and variables → Actions**.
4. Add `VITE_SUPABASE_URL` with the Supabase project URL.
5. Add `VITE_SUPABASE_ANON_KEY` with the Supabase publishable/anon key.
6. Re-run the **Deploy Skyball to GitHub Pages** workflow.

For local development, copy `.env.example` to `.env.local` and enter the same values. The browser stores a random anonymous player ID and the chosen display name—no email, password, account, or fingerprint is used. Editing a name updates the current display name across leaderboard views; historical timing and split records remain attached to the same anonymous identity.

## Project structure

```text
Skyball/
├── assets/audio/Chrome Drift.mp3
├── src/game.js
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
├── README.md
├── styles.css
└── vite.config.js
```

The supplied marble recording is velocity-controlled and routed through a long browser-generated reverb. The first landing has a metallic impact cue, and a reverberant glass burst accompanies the timeout shatter. Additional contact texture, unlocking, and completion cues use the Web Audio API. The musical cues are tuned to the soundtrack's E-flat minor key.
