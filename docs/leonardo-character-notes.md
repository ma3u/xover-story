# Why Leonardo (and similar AI) struggle with existing comic characters and style

## 1. Existing comic characters: likeness and consistency

**What goes wrong**
- Models are trained on many images of many styles. There is no single “canonical” version of a character; the model often **blends** traits from different fan art, official art, and anime vs manga.
- **Copyright / genericization:** Some systems are tuned to avoid close copies of copyrighted characters, so outputs can become more generic when you use character names or clear references.
- **Name alone is not enough:** Prompts like “Tanjiro from Demon Slayer” can yield “generic anime boy with earrings” instead of a consistent, on-model likeness.

**What helps**
- **Character Reference (reference image):** Using one or a few reference images of the character (same design, same style) gives the model a clear target and improves consistency. Leonardo supports this in the app; the API may expose it via image-to-image or similar.
- **LoRA / custom elements:** Training a small adapter (e.g. on 8–10 clear reference images) locks in a specific look and helps keep “original characters” on-model.
- **Very specific visual description:** Describe hair, clothes, and key features in detail (e.g. “hanafuda earrings, checkered haori, scar on forehead”) so the model relies less on the name and more on concrete traits.
- **Stick to original character design in prompts:** We explicitly ask for “original anime character design” and describe the character as in the source, to reduce drift toward random OCs.

## 2. “Typical comic style” instead of the intended style

**What goes wrong**
- Vague style terms (e.g. “comic style”, “manga style”) map to **generic** patterns in the training data, so you get a common “AI comic look” instead of the style of a specific series.
- Each series has its own look (e.g. Apothecary Diaries vs Demon Slayer vs Hunter x Hunter). A single generic “comic” prompt cannot capture those differences.
- Models tend to average over many styles, so without a strong anchor (reference image or very specific style description), output drifts toward a typical “comic” or “anime” average.

**What helps**
- **Avoid generic “comic style” when you want a specific show:** Prefer “original anime character design” and the **series name** (e.g. “from Demon Slayer”, “from Kusuriya no Hitorigoto”) so the model can associate with that show’s style.
- **Describe the style you want:** e.g. “black and white line art”, “ink style”, “no background” instead of only “comic style”.
- **Negative prompt:** Exclude what you don’t want (e.g. “generic comic”, “Western comic”, “3D render”, “realistic”) to reduce the “typical comic” look.
- **Reference image:** One image in the desired style (same series or same character) is the strongest way to get that style and avoid a generic comic look.

## 3. Project choices (this repo)

- **No literal pencil:** We never ask for “pencil sketch” or “graphite” and we **negative-prompt** “pencil as object”, “drawing utensil”, “pencil in hand” so the image never shows a pencil.
- **Original characters only:** Prompts name the character and series and ask for “original anime character design” so we aim for the existing character, not a new one.
- **Style:** We use “black and white line art”, “monochrome”, “ink style”, “no background” and avoid vague “comic style” so the model does not default to a single generic comic look.
- **Future improvement:** For best likeness and style, use Leonardo’s **Character Reference** with a clear reference image (or LoRA) plus these text prompts.
