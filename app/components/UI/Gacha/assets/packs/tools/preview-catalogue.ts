/** Offline catalogue preview. Never import this script into the mobile app. */
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FONTS = resolve(ROOT, '../../../../../fonts');
const OUTPUT = resolve(ROOT, 'previews/catalogue.jpg');
const COLUMNS = 6;
const TILE_WIDTH = 220;
const TILE_HEIGHT = 470;
const HEADER_HEIGHT = 72;
const IMAGE = { width: 200, height: 400 };
const BACKGROUND = '#151515';

interface Catalogue {
  packs: { code: string; displayName: string; source: string }[];
}

/** Renders measured labels using the repository font files. */
async function label(
  text: string,
  size: number,
  colour: string,
  weight: 'Medium' | 'Bold' = 'Medium',
) {
  const escapedText = text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
  return sharp({
    text: {
      text: `<span foreground="${colour}">${escapedText}</span>`,
      font: `MM Sans ${weight} ${size}`,
      fontfile: resolve(FONTS, `MMSans-${weight}.otf`),
      dpi: 72,
      rgba: true,
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
}

/** Builds all 31 tiles in manifest order, refusing incomplete catalogues. */
async function render(): Promise<void> {
  const catalogue: Catalogue = JSON.parse(
    await readFile(resolve(ROOT, 'catalog/art-direction.json'), 'utf8'),
  );
  if (catalogue.packs.length !== 31)
    throw new Error('The preview requires all 31 manifest entries.');
  const packs = catalogue.packs.map((pack) => ({
    ...pack,
    image: resolve(dirname(resolve(ROOT, pack.source)), 'pack.webp'),
  }));
  const missing = packs.filter((pack) => !existsSync(pack.image));
  if (missing.length > 0)
    throw new Error(
      `Missing composed packs (${missing.length}):\n${missing.map((pack) => `${pack.code}: ${pack.image}`).join('\n')}`,
    );

  const width = COLUMNS * TILE_WIDTH;
  const height =
    HEADER_HEIGHT + Math.ceil(packs.length / COLUMNS) * TILE_HEIGHT;
  const layers: sharp.OverlayOptions[] = [];
  const title = await label('GACHA / 31 PACKS', 26, '#f5f5f5', 'Bold');
  layers.push({
    input: title.data,
    left: Math.round((width - title.info.width) / 2),
    top: 26,
  });

  for (const [index, pack] of packs.entries()) {
    const left = (index % COLUMNS) * TILE_WIDTH;
    const top = HEADER_HEIGHT + Math.floor(index / COLUMNS) * TILE_HEIGHT;
    const image = await sharp(pack.image)
      .resize(IMAGE.width, IMAGE.height, {
        fit: 'contain',
        kernel: 'lanczos3',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
    const name = await label(pack.displayName, 20, '#f5f5f5');
    const code = await label(pack.code, 14, '#adadad');
    if (name.info.width > IMAGE.width || code.info.width > IMAGE.width)
      throw new Error(`Preview label too wide: ${pack.code}`);
    layers.push(
      { input: image, left: left + 10, top },
      {
        input: name.data,
        left: left + Math.round((TILE_WIDTH - name.info.width) / 2),
        top: top + 410,
      },
      {
        input: code.data,
        left: left + Math.round((TILE_WIDTH - code.info.width) / 2),
        top: top + 439,
      },
    );
  }

  await mkdir(dirname(OUTPUT), { recursive: true });
  await sharp({
    create: { width, height, channels: 3, background: BACKGROUND },
  })
    .composite(layers)
    .toColourspace('srgb')
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4', mozjpeg: true })
    .toFile(OUTPUT);
  process.stdout.write(`Created ${OUTPUT} (${width} × ${height}, 31 packs).\n`);
}

/** Keeps font selection deterministic and its cache outside the repository. */
async function main(): Promise<void> {
  const temporary = await mkdtemp(resolve(tmpdir(), 'gacha-catalogue-fonts-'));
  try {
    const configuration = resolve(temporary, 'fonts.conf');
    await writeFile(
      configuration,
      `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd"><fontconfig><dir>${FONTS}</dir><cachedir>${temporary}</cachedir></fontconfig>`,
    );
    process.env.FONTCONFIG_FILE = configuration;
    await render();
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
