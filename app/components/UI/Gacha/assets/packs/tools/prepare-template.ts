/** Offline asset preparation. Never import this script into the mobile app. */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIRECTORY = resolve(ROOT, 'templates');
const RECIPE = resolve(DIRECTORY, 'recipe.json');
const PROMPT_FILE = 'template.md';
const WIDTH = 1024;
const HEIGHT = 2048;
const PACK = { left: 64, top: 128, width: 896, height: 1792 };
const PNG_OPTIONS = { compressionLevel: 9, adaptiveFiltering: false } as const;

/**
 * SHA-256 of the exact bytes kept in the asset archive.
 *
 * @param bytes - Archived file contents.
 * @returns Hexadecimal content hash.
 */
const sha256 = (bytes: Buffer): string =>
  createHash('sha256').update(bytes).digest('hex');

/** Rebuilds the normalized preview and reusable material maps. */
async function main(): Promise<void> {
  const source = await readFile(resolve(DIRECTORY, 'source.png'));
  const sourceHash = sha256(source);
  const previous:
    | { source: { sha256: string }; promptSha256: string }
    | undefined = existsSync(RECIPE)
    ? JSON.parse(await readFile(RECIPE, 'utf8'))
    : undefined;
  // Prompt edits for future candidates do not change this source's provenance.
  const promptHash =
    previous?.source.sha256 === sourceHash
      ? previous.promptSha256
      : sha256(await readFile(resolve(ROOT, 'prompts', PROMPT_FILE)));
  const metadata = await sharp(source).metadata();
  if (!metadata.hasAlpha) throw new Error('The master must have real alpha.');
  const rawSource = await sharp(source)
    .toColourspace('srgb')
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let left = rawSource.info.width;
  let top = rawSource.info.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < rawSource.info.height; y++) {
    for (let x = 0; x < rawSource.info.width; x++) {
      if (rawSource.data[(y * rawSource.info.width + x) * 4 + 3] <= 8) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left) throw new Error('The master contains no visible pouch.');
  const crop = { left, top, width: right - left + 1, height: bottom - top + 1 };
  // Deliberately normalize the pouch to 1:2 once, before approving its geometry.
  const normalized = await sharp(source)
    .extract(crop)
    .resize(PACK.width, PACK.height, { fit: 'fill', kernel: 'lanczos3' })
    .extend({
      left: PACK.left,
      right: PACK.left,
      top: PACK.top,
      bottom: PACK.top,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toColourspace('srgb')
    .ensureAlpha()
    .raw()
    .toBuffer();

  for (let offset = 0; offset < normalized.length; offset += 4) {
    const light = Math.round(
      0.2126 * normalized[offset] +
        0.7152 * normalized[offset + 1] +
        0.0722 * normalized[offset + 2],
    );
    normalized[offset] = light;
    normalized[offset + 1] = light;
    normalized[offset + 2] = light;
  }

  const luminance: number[] = [];
  // Fixed quiet central region, clear of seams, side creases and future text.
  for (let y = 512; y < 1280; y++) {
    for (let x = 320; x < 704; x++) {
      luminance.push(normalized[(y * WIDTH + x) * 4]);
    }
  }
  luminance.sort((a, b) => a - b);
  const midtone = luminance[Math.floor(luminance.length / 2)] / 255;
  if (midtone <= 0 || midtone >= 1)
    throw new Error('No usable material midtone.');

  const mask = Buffer.alloc(WIDTH * HEIGHT * 4);
  const shadows = Buffer.alloc(mask.length);
  const highlights = Buffer.alloc(mask.length);
  for (let offset = 0; offset < normalized.length; offset += 4) {
    const sourceAlpha = normalized[offset + 3];
    const alpha = sourceAlpha <= 8 ? 0 : sourceAlpha >= 250 ? 255 : sourceAlpha;
    normalized[offset + 3] = alpha;
    const light = normalized[offset] / 255;
    const shadowAlpha = Math.round(255 * Math.max(0, 1 - light / midtone));
    const highlightAlpha = Math.round(
      255 * Math.max(0, (light - midtone) / (1 - midtone)),
    );
    for (let channel = 0; channel < 3; channel++) {
      mask[offset + channel] = 255;
      highlights[offset + channel] = 255;
      if (alpha === 0) normalized[offset + channel] = 0;
    }
    mask[offset + 3] = alpha;
    shadows[offset + 3] = alpha > 0 ? shadowAlpha : 0;
    highlights[offset + 3] = alpha > 0 ? highlightAlpha : 0;
  }

  const layers = {
    'template.png': normalized,
    'mask.png': mask,
    'shadows.png': shadows,
    'highlights.png': highlights,
  };
  const outputs: Record<string, { sha256: string; bytes: number }> = {};
  for (const [name, pixels] of Object.entries(layers)) {
    const encoded = await sharp(pixels, {
      raw: { width: WIDTH, height: HEIGHT, channels: 4 },
    })
      .png(PNG_OPTIONS)
      .toBuffer();
    await writeFile(resolve(DIRECTORY, name), encoded);
    outputs[name] = { sha256: sha256(encoded), bytes: encoded.length };
  }
  await writeFile(
    RECIPE,
    `${JSON.stringify(
      {
        status: 'template-approved',
        approvedAt: '2026-09-30',
        generator: {
          tool: 'image_gen.imagegen',
          model: 'not exposed by built-in tool',
          seed: 'not exposed',
          prompt: `../prompts/${PROMPT_FILE}`,
        },
        source: {
          sha256: sourceHash,
          width: metadata.width,
          height: metadata.height,
          hasAlpha: metadata.hasAlpha,
          crop,
        },
        canvas: {
          width: WIDTH,
          height: HEIGHT,
          colourspace: 'sRGB',
          packBounds: PACK,
        },
        material: {
          midtone,
          midtoneRegion: { left: 320, top: 512, width: 384, height: 768 },
          alphaThresholds: { transparent: 8, opaque: 250 },
        },
        software: {
          node: process.version,
          platform: process.platform,
          architecture: process.arch,
          sharp: sharp.versions,
        },
        promptSha256: promptHash,
        scriptSha256: sha256(await readFile(fileURLToPath(import.meta.url))),
        outputs,
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
