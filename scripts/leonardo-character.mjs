#!/usr/bin/env node
/**
 * Generate a single character portrait via Leonardo.AI.
 * Usage: node scripts/leonardo-character.mjs "prompt here"
 * Or with preset: node scripts/leonardo-character.mjs --maomao
 */

import { readFileSync, existsSync } from "fs";
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

const PRESETS = {
  maomao: "Maomao from Apothecary Diaries, character portrait, young woman with red hair in twin buns, intelligent eyes, traditional East Asian setting, black and white pencil sketch, graphite drawing, soft shading, anime character design, head and shoulders portrait",
};

let prompt = process.argv.slice(2).filter((a) => !a.startsWith("--")).join(" ");
const presetFlag = process.argv.find((a) => a.startsWith("--"));
if (presetFlag === "--maomao" || !prompt) prompt = PRESETS.maomao;

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
      ...(options.presetStyle && { presetStyle: options.presetStyle }),
      alchemy: false,
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

(async () => {
  console.log("Prompt:", prompt);
  console.log("Creating generation...");
  const generationId = await createGeneration(prompt, {});
  console.log("Generation ID:", generationId, "- waiting for completion...");
  const imageUrl = await waitForComplete(generationId);
  console.log("Done. Image URL:\n" + imageUrl);
})();
