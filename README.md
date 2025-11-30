<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Into the Stars: Von Neumann Expansion

[![Deploy](https://github.com/Swquenzer/Into-the-Stars-Von-Neumann-Expansion/actions/workflows/deploy.yml/badge.svg)](https://github.com/Swquenzer/Into-the-Stars-Von-Neumann-Expansion/actions/workflows/deploy.yml)

- Live: https://swquenzer.github.io/Into-the-Stars-Von-Neumann-Expansion/
- AI Studio: https://ai.studio/apps/drive/1YZ_620kX0Fg8byA_KPLJ2WWrbdV56PXh

## Run Locally

- Prereq: Node.js 20+
- Install: `npm install`
- Env: Set `GEMINI_API_KEY` in `.env.local`
- Dev: `npm run dev`

## Deploy

GitHub Pages deploy is automated via GitHub Actions.

- Workflow: `.github/workflows/deploy.yml`
- Base path: set in `vite.config.ts` as `/Into-the-Stars-Von-Neumann-Expansion/`

Trigger a deploy:

```powershell
npm run build
git add .
git commit -m "chore: setup GH Pages"
git push
```

Enable Pages in GitHub Settings:

- Settings → Pages → Build and deployment → Source: GitHub Actions
