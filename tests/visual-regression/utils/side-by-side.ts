/* eslint-disable import-x/no-nodejs-modules, @metamask/design-tokens/color-no-hex */
import { resolve, join } from 'path';
import { mkdirSync } from 'fs';
import sharp from 'sharp';

const VISUAL_REGRESSION_ROOT = resolve(__dirname, '..');
const DIFFS_DIR = join(VISUAL_REGRESSION_ROOT, 'diffs');
const GAP = 20;
const HEADER_HEIGHT = 80;

export async function createSideBySide(
  baselinePath: string,
  currentPath: string,
  name: string,
): Promise<string | null> {
  try {
    const baselineImg = sharp(baselinePath);
    const currentImg = sharp(currentPath);

    const [baselineMeta, currentMeta] = await Promise.all([
      baselineImg.metadata(),
      currentImg.metadata(),
    ]);

    const bw = baselineMeta.width ?? 0;
    const bh = baselineMeta.height ?? 0;
    const cw = currentMeta.width ?? 0;
    const ch = currentMeta.height ?? 0;

    const canvasWidth = bw + cw + GAP;
    const canvasHeight = Math.max(bh, ch) + HEADER_HEIGHT;

    const canvas = sharp(
      Buffer.from(
        `<svg width="${canvasWidth}" height="${canvasHeight}">
          <rect width="${canvasWidth}" height="${canvasHeight}" fill="#282828"/>
          <rect y="0" width="${canvasWidth}" height="${HEADER_HEIGHT}" fill="#1a1a1a"/>
          <text x="${bw / 2}" y="50" text-anchor="middle" fill="#4ade80" font-size="24" font-family="monospace">BASELINE</text>
          <text x="${bw + GAP + cw / 2}" y="50" text-anchor="middle" fill="#f87171" font-size="24" font-family="monospace">CURRENT</text>
        </svg>`,
      ),
    );

    const [baselineBuf, currentBuf] = await Promise.all([
      sharp(baselinePath).toBuffer(),
      sharp(currentPath).toBuffer(),
    ]);

    mkdirSync(DIFFS_DIR, { recursive: true });
    const outputPath = join(DIFFS_DIR, `${name}_comparison.png`);

    await canvas
      .composite([
        { input: baselineBuf, top: HEADER_HEIGHT, left: 0 },
        { input: currentBuf, top: HEADER_HEIGHT, left: bw + GAP },
      ])
      .png()
      .toFile(outputPath);

    return outputPath;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[visual-regression] Failed to create side-by-side for ${name}: ${message}`,
    );
    return null;
  }
}
