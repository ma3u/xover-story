#!/usr/bin/env node
/**
 * Generate comic panel images via Leonardo.AI API.
 * Requires LEONARDO_API_KEY in .env or environment.
 *
 * Usage:
 *   node scripts/leonardo-generate.mjs           # generate all panels
 *   node scripts/leonardo-generate.mjs --panel 3  # generate only panel 3
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const API_BASE = "https://cloud.leonardo.ai/api/rest/v1";

// Load .env from project root if present
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
  console.error("Missing LEONARDO_API_KEY. Copy .env.example to .env and add your key.");
  console.error("Get a key at https://app.leonardo.ai (log in with Apple ID or email) → API Access.");
  process.exit(1);
}

const promptsPath = join(__dirname, "panel-prompts.json");
const promptsData = JSON.parse(readFileSync(promptsPath, "utf8"));
const panels = promptsData.panels;

const onlyPanel = process.argv.includes("--panel")
  ? parseInt(process.argv[process.argv.indexOf("--panel") + 1], 10)
  : null;
const toRun = onlyPanel ? panels.filter((p) => p.panel === onlyPanel) : panels;
if (toRun.length === 0) {
  console.error("No panels to run. Use --panel N to generate a single panel.");
  process.exit(1);
}

// Default model (Leonardo Phoenix or similar); use a known platform model
const DEFAULT_MODEL_ID = "b24e16ff-06e3-43eb-8d33-4416c2d75876";

async function createGeneration(prompt) {
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
      width: 832,
      height: 512,
      alchemy: false,
      photoReal: false,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Create generation failed: ${res.status} ${t}`);
  }
  const data = await res.json();
  return data.generationId;
}

async function getGeneration(id) {
  const res = await fetch(`${API_BASE}/generations/${id}`, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${apiKey}`,
    },
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
    const status = gen.status;
    if (status === "COMPLETE") {
      const images = gen.generated_images || [];
      const url = images[0]?.url;
      if (url) return url;
      throw new Error("Generation complete but no image URL");
    }
    if (status === "FAILED") throw new Error("Generation failed");
    await new Promise((r) => setTimeout(r, step));
  }
  throw new Error("Timeout waiting for generation");
}

const resultsPath = join(__dirname, "panel-images.json");
let results = {};
if (existsSync(resultsPath)) {
  try {
    results = JSON.parse(readFileSync(resultsPath, "utf8"));
  } catch (_) {}
}

for (const item of toRun) {
  console.log(`Panel ${item.panel}: ${item.title} ...`);
  try {
    const generationId = await createGeneration(item.prompt);
    console.log(`  Generation ID: ${generationId}, waiting for completion...`);
    const imageUrl = await waitForComplete(generationId);
    results[String(item.panel)] = { url: imageUrl, alt: item.alt };
    console.log(`  Done: ${imageUrl}`);
  } catch (e) {
    console.error(`  Error: ${e.message}`);
  }
}

writeFileSync(resultsPath, JSON.stringify(results, null, 2));
console.log(`\nResults written to scripts/panel-images.json. Use these URLs in Dimensionsrisse.html.`);
