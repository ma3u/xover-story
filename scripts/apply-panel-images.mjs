#!/usr/bin/env node
/**
 * Update Dimensionsrisse.html with image URLs from scripts/panel-images.json.
 * Run after leonardo-generate.mjs to replace panel image src attributes.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const resultsPath = join(__dirname, "panel-images.json");
const htmlPath = join(ROOT, "Dimensionsrisse.html");

if (!existsSync(resultsPath)) {
  console.error("Run leonardo-generate.mjs first to create panel-images.json");
  process.exit(1);
}

const results = JSON.parse(readFileSync(resultsPath, "utf8"));
let html = readFileSync(htmlPath, "utf8");

for (const [panel, { url }] of Object.entries(results)) {
  if (!url) continue;
  // Replace the first <img src="..." in the block that follows data-panel="N"
  const re = new RegExp(
    `(data-panel="${panel}"[^>]*>.*?<img src=")[^"]*(")`,
    "s"
  );
  if (re.test(html)) {
    html = html.replace(re, `$1${url}$2`);
    console.log(`Panel ${panel}: updated`);
  }
}

writeFileSync(htmlPath, html);
console.log("Dimensionsrisse.html updated. Also update index.html if you use it.");
