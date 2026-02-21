#!/usr/bin/env node
/**
 * Generate all character portraits from scripts/character-prompts.json.
 * Uses base prompt: black and white, pencil sketch, comic style, no background.
 *
 * Usage:
 *   node scripts/leonardo-characters.mjs              # generate all characters
 *   node scripts/leonardo-characters.mjs maomao       # generate one character by id
 *   node scripts/leonardo-characters.mjs --apply       # only apply existing character-images.json to index.html
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const API_BASE = "https://cloud.leonardo.ai/api/rest/v1";

function loadEnv() {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}
loadEnv();

const apiKey = process.env.LEONARDO_API_KEY;
if (!apiKey) {
  console.error("Missing LEONARDO_API_KEY in .env");
  process.exit(1);
}

const configPath = join(__dirname, "character-prompts.json");
const config = JSON.parse(readFileSync(configPath, "utf8"));
const { basePrompt, negativePrompt, styleSuffix, characters } = config;

function buildPrompt(char) {
  return [basePrompt, char.prompt, styleSuffix].filter(Boolean).join(", ");
}

const DEFAULT_MODEL_ID = "b24e16ff-06e3-43eb-8d33-4416c2d75876";

async function createGeneration(prompt, options = {}) {
  const res = await fetch(`${API_BASE}/generations`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt,
      modelId: DEFAULT_MODEL_ID,
      num_images: 1,
      width: options.width ?? 768,
      height: options.height ?? 768,
      negative_prompt: options.negative_prompt ?? negativePrompt,
      presetStyle: "SKETCH_BW",
      alchemy: true,
      photoReal: false,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Create generation failed: ${res.status} ${t}`);
  }
  const data = await res.json();
  const id = data.generationId ?? data.sdGenerationJob?.generationId;
  if (!id) throw new Error("No generationId in response: " + JSON.stringify(data));
  return id;
}

async function getGeneration(id) {
  const res = await fetch(`${API_BASE}/generations/${id}`, {
    headers: { accept: "application/json", authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`Get generation failed: ${res.status}`);
  return res.json();
}

async function waitForComplete(generationId, maxWaitMs = 120000) {
  const step = 3000;
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const data = await getGeneration(generationId);
    const gen = data.generations_by_pk;
    if (!gen) throw new Error("Invalid generation response");
    if (gen.status === "COMPLETE") {
      const url = gen.generated_images?.[0]?.url;
      if (url) return url;
      throw new Error("Generation complete but no image URL");
    }
    if (gen.status === "FAILED") throw new Error("Generation failed");
    await new Promise((r) => setTimeout(r, step));
  }
  throw new Error("Timeout waiting for generation");
}

const resultsPath = join(__dirname, "character-images.json");
const htmlPath = join(ROOT, "index.html");

const APPLY_ONLY = process.argv.includes("--apply");
const onlyId = process.argv.find((a) => !a.startsWith("--") && characters.some((c) => c.id === a));

let toRun = onlyId ? characters.filter((c) => c.id === onlyId) : characters;

if (APPLY_ONLY) {
  if (!existsSync(resultsPath)) {
    console.error("Run without --apply first to generate images. character-images.json not found.");
    process.exit(1);
  }
  const results = JSON.parse(readFileSync(resultsPath, "utf8"));
  let html = readFileSync(htmlPath, "utf8");
  const order = ["maomao", "tanjiro", "gon", "nezuko"];
  for (const id of order) {
    const r = results[id];
    if (!r?.url) continue;
    const alt = characters.find((c) => c.id === id)?.alt ?? id;
    const re = new RegExp(
      `(<img src=")[^"]*(" alt="${alt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}" class="character-portrait">)`
    );
    html = html.replace(re, `$1${r.url}$2`);
    console.log("Applied", id);
  }
  writeFileSync(htmlPath, html);
  console.log("index.html updated.");
  process.exit(0);
}

let results = {};
if (existsSync(resultsPath)) {
  try {
    results = JSON.parse(readFileSync(resultsPath, "utf8"));
  } catch (_) {}
}

(async () => {
  console.log("Base prompt (EN):", basePrompt);
  console.log("Characters to generate:", toRun.map((c) => c.id).join(", "));
  for (const char of toRun) {
    const fullPrompt = buildPrompt(char);
    console.log("\n---", char.name, "---");
    console.log("Prompt:", fullPrompt);
    try {
      const generationId = await createGeneration(fullPrompt, { negative_prompt: negativePrompt });
      console.log("Generation ID:", generationId, "- waiting...");
      const imageUrl = await waitForComplete(generationId);
      results[char.id] = { url: imageUrl, alt: char.alt };
      console.log("Done:", imageUrl);
    } catch (e) {
      console.error("Error:", e.message);
    }
  }
  writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log("\nResults saved to scripts/character-images.json");
  console.log("Run with --apply to update index.html with these URLs.");
})();
