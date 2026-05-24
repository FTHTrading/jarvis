/**
 * Generates Unykorn icons as SVG files (128, 48, 16 px).
 * Run: node scripts/gen-icons.js
 * Then convert SVG → PNG with any tool (e.g. librsvg, Inkscape, sharp).
 */
const fs = require("fs");
const path = require("path");
const ICON_DIR = path.join(__dirname, "../extension/icons");
fs.mkdirSync(ICON_DIR, { recursive: true });

function makeSvg(size) {
  const r = size / 2;
  const strokeW = Math.max(1, size / 16);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1a0a3a"/>
      <stop offset="100%" stop-color="#0c0c14"/>
    </radialGradient>
    <linearGradient id="ring" x1="0" y1="0" x2="${size}" y2="${size}">
      <stop offset="0%" stop-color="#a78bfa"/>
      <stop offset="100%" stop-color="#7C3AED"/>
    </linearGradient>
  </defs>
  <circle cx="${r}" cy="${r}" r="${r}" fill="url(#bg)"/>
  <circle cx="${r}" cy="${r}" r="${r - strokeW}" stroke="url(#ring)" stroke-width="${strokeW}" fill="none"/>
  <circle cx="${r}" cy="${r}" r="${r * 0.45}" fill="#7C3AED" opacity="0.8"/>
  <circle cx="${r}" cy="${r}" r="${r * 0.18}" fill="#ffffff"/>
</svg>`;
}

[128, 48, 16].forEach(sz => {
  const file = path.join(ICON_DIR, `icon${sz}.svg`);
  fs.writeFileSync(file, makeSvg(sz));
  console.log(`Wrote ${file}`);
});
console.log("Icons generated. Convert SVG→PNG with: npx sharp-cli or librsvg.");
