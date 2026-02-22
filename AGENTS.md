# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**Die Dimensionsrisse** – an interactive crossover comic (Apothecary Diaries × Demon Slayer × Hunter × Hunter), served as a static site via GitHub Pages from the `main` branch. The primary language of the site and story content is German; prompts and technical code are in English.

Live site: https://ma3u.github.io/xover-story/

## Architecture

- **`index.html`** – Single-page app containing all content: Start, Charaktere (characters), and Geschichte (story). Page switching is handled via JS toggling `.active` class on `.page` divs. CSS is embedded inline; there is no build step or bundler.
- **`scripts/`** – Node.js (ESM) scripts that interact with the Leonardo.AI API to generate images. These are run locally, not as part of CI. They hand-roll `.env` parsing (no dotenv dependency).
- **`api/leonardo-webhook.js`** – Optional Vercel serverless function that acknowledges Leonardo webhook POSTs. Not required; all scripts use polling.
- **`docs/`** – Design notes (e.g. `leonardo-character-notes.md` on AI image generation challenges).

### Image Generation Pipeline

1. **Panel images**: Edit prompts in `scripts/panel-prompts.json` → run `node scripts/leonardo-generate.mjs` → URLs saved to `scripts/panel-images.json` → apply with `node scripts/apply-panel-images.mjs` (writes URLs into `Dimensionsrisse.html`).
2. **Character portraits**: Prompts composed from `scripts/character-prompts.json` (base prompt + per-character prompt + style suffix) → run `node scripts/leonardo-characters.mjs` → URLs saved to `scripts/character-images.json` → apply with `node scripts/leonardo-characters.mjs --apply` (regex-replaces `<img>` src in `index.html` matching by alt text and `.character-portrait` class).

Both JSON result files (`panel-images.json`, `character-images.json`) are gitignored.

## Commands

### Deploy (GitHub Pages)

Pushing to `main` triggers `.github/workflows/deploy-pages.yml`, which deploys the repo root as a static site. No build step.

```
git add . && git commit -m "message" && git push origin main
```

### Generate panel images (uses Leonardo.AI API credits)

```
node scripts/leonardo-generate.mjs            # all 8 panels
node scripts/leonardo-generate.mjs --panel 3   # single panel
node scripts/apply-panel-images.mjs            # write URLs into Dimensionsrisse.html
```

### Generate character portraits

```
node scripts/leonardo-characters.mjs           # all characters
node scripts/leonardo-characters.mjs maomao    # one character by id (maomao|tanjiro|gon|nezuko)
node scripts/leonardo-characters.mjs --apply   # write URLs into index.html
```

### Environment

```
cp .env.example .env
# Set LEONARDO_API_KEY=<key> (from https://app.leonardo.ai → API Access)
```

## Key Conventions

- **No build system** – the site is plain HTML/CSS/JS with no dependencies or package.json.
- **Image style rules** – Character portraits use black-and-white ink line art. The negative prompt explicitly excludes pencils/drawing utensils, color, backgrounds, and realistic/3D styles. See `scripts/character-prompts.json` for the canonical base prompt.
- **Leonardo model ID** – Scripts hardcode model `b24e16ff-06e3-43eb-8d33-4416c2d75876` (Leonardo Phoenix). Change this constant in the scripts if switching models.
- **Regex-based HTML patching** – The apply scripts use regex replacement to inject image URLs into HTML files. They match on `data-panel` attributes (panels) or `alt` + `.character-portrait` class (characters). Be careful when restructuring the HTML to preserve these patterns.
- **User may communicate in German** – respond in German when addressed in German; keep technical terms in English.
