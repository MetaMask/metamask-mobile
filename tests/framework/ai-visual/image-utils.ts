// eslint-disable-next-line import-x/no-nodejs-modules
import fs from 'fs';
// eslint-disable-next-line import-x/no-nodejs-modules
import path from 'path';

export function saveBase64Screenshot(
  base64Data: string,
  outputPath: string,
): void {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, Buffer.from(base64Data, 'base64'));
}

export async function createSideBySideComparison(
  baselinePath: string,
  currentPath: string,
  outputPath: string,
): Promise<string | null> {
  try {
    // Dynamic import — sharp is optional and only needed for diff images
    const { default: sharp } = await import('sharp');

    const [baseline, current] = await Promise.all([
      sharp(baselinePath).metadata(),
      sharp(currentPath).metadata(),
    ]);

    const baselineWidth = baseline.width ?? 0;
    const currentWidth = current.width ?? 0;
    const baselineHeight = baseline.height ?? 0;
    const currentHeight = current.height ?? 0;

    const width = baselineWidth + currentWidth;
    const height = Math.max(baselineHeight, currentHeight);

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([
        { input: baselinePath, left: 0, top: 0 },
        { input: currentPath, left: baselineWidth, top: 0 },
      ])
      .png()
      .toFile(outputPath);

    return outputPath;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to create side-by-side comparison:', message);
    return null;
  }
}
