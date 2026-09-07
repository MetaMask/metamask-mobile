#!/usr/bin/env node
/**
 * Rasterises design-system SVG icons into template PNGs for the native tab bar.
 *
 * The native tab bar (`Tabs.Screen` from react-native-screens) accepts only SF
 * Symbols, xcassets or template images — it cannot render the design-system
 * `Icon` React components. SVGs in this repo compile to components (`svg` is in
 * metro's `sourceExts`, not `assetExts`), so they are not valid image sources
 * either. Hence this pre-rasterisation step.
 *
 * Template images are rendered by iOS from their **alpha channel** and tinted
 * with `tabBarTintColor`, so the fill colour is irrelevant — only coverage
 * matters. A solid white fill is used so the PNGs are also legible if ever
 * rendered untinted.
 *
 * Usage:
 *   node scripts/generate-native-tab-icons.mjs
 *
 * Re-run whenever a source SVG changes, then commit the regenerated PNGs.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const ICON_ASSETS = path.join(
  REPO_ROOT,
  'app/component-library/components/Icons/Icon/assets',
);
const OUT_DIR = path.join(
  REPO_ROOT,
  'app/components/Nav/NativeBottomTabs/assets',
);

/** iOS tab bar item icons are ~28pt. */
const BASE_POINTS = 28;
const SCALES = [1, 2, 3];

/** Source SVG -> output basename. */
const ICONS = [{ svg: 'metamask-fox-filled.svg', out: 'metamask-fox-filled' }];

async function rasterise(svgName, outName) {
  const svgPath = path.join(ICON_ASSETS, svgName);
  if (!fs.existsSync(svgPath)) {
    throw new Error(`Source SVG not found: ${svgPath}`);
  }

  // These icons inherit `currentColor` and carry no fill attribute, which would
  // rasterise as transparent. Give them an explicit fill so the alpha channel
  // describes the glyph.
  const svg = fs
    .readFileSync(svgPath, 'utf8')
    .replace(/<path(?![^>]*\bfill=)/g, '<path fill="#FFFFFF"');

  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const scale of SCALES) {
    const px = BASE_POINTS * scale;
    const suffix = scale === 1 ? '' : `@${scale}x`;
    const file = path.join(OUT_DIR, `${outName}${suffix}.png`);

    await sharp(Buffer.from(svg), { density: 72 * scale * 4 })
      .resize(px, px, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ compressionLevel: 9 })
      .toFile(file);

    // A glyph must have partial coverage; a fully opaque or fully transparent
    // result means the fill injection or the viewBox handling went wrong.
    const { channels } = await sharp(file).stats();
    const alpha = channels[3];
    if (!alpha || alpha.max === 0) {
      throw new Error(`${file} has an empty alpha channel`);
    }

    console.log(
      `wrote ${path.relative(REPO_ROOT, file)} ${px}x${px} ` +
        `(alpha mean ${alpha.mean.toFixed(1)})`,
    );
  }
}

for (const { svg, out } of ICONS) {
  await rasterise(svg, out);
}
