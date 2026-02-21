# Die Dimensionsrisse

An interactive comic crossover: *Apothecary Diaries* × *Demon Slayer* × *Hunter x Hunter*.

- **Site:** [https://ma3u.github.io/xover-story/](https://ma3u.github.io/xover-story/)

## Leonardo.AI image generation

Panel images can be generated with the [Leonardo.AI API](https://leonardo.ai/api).

### 1. Log in and get an API key

1. Open **[https://app.leonardo.ai](https://app.leonardo.ai)** and sign in (e.g. **Sign in with Apple** or email).
2. Go to **API Access** in the left menu (or [Buy Credit / API](https://app.leonardo.ai/api-access)).
3. Click **Create New Key**, name it (e.g. `xover-story`), and copy the key.
4. **Webhook callback URL:** Leave it **blank**. It’s optional. The project uses polling (the script checks Leonardo until the image is ready), so a webhook is not required. If the form won’t let you leave it empty, see [Optional: Webhook callback URL](#optional-webhook-callback-url) below for a URL you can use.

### 2. Configure the project

```bash
cp .env.example .env
# Edit .env and set:
# LEONARDO_API_KEY=your_copied_key
```

Never commit `.env`; it is listed in `.gitignore`.

### 3. Generate panel images

From the project root:

```bash
# Generate images for all 8 panels (uses API credits)
node scripts/leonardo-generate.mjs

# Or generate a single panel
node scripts/leonardo-generate.mjs --panel 3
```

Generated image URLs are saved to `scripts/panel-images.json`.

### 4. Apply URLs to the comic

Update `Dimensionsrisse.html` with the new image URLs:

```bash
node scripts/apply-panel-images.mjs
```

Then refresh the site or commit and push.

### Customizing prompts

Edit `scripts/panel-prompts.json` to change the text prompt for each panel. Re-run the generate script for the panels you change.

### Optional: Webhook callback URL

You do **not** need a webhook for this project. The script polls Leonardo until each generation is complete.

If Leonardo’s form requires a URL and won’t accept a blank value:

1. **Quick option:** Use [webhook.site](https://webhook.site): open the site, copy your unique inbox URL (e.g. `https://webhook.site/xxx-xxx`), and paste it as the Webhook callback URL. You can leave “Webhook callback API key” blank. You’ll be able to see the payloads Leonardo sends there; the script will still work with polling.
2. **Project-owned URL:** Deploy the included webhook endpoint so you have an HTTPS URL that belongs to this repo:
   - Install the [Vercel CLI](https://vercel.com/docs/cli) and run `vercel` in the project root (link the repo if asked).
   - After deploy, use `https://<your-project>.vercel.app/api/leonardo-webhook` as the Webhook callback URL in Leonardo. The endpoint only acknowledges the request (returns 200); the script still uses polling to get image URLs.
