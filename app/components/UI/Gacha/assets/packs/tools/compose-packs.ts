/** Offline catalogue artwork composition. Never import this script into the app. */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import sharp from 'sharp';
import {
  selectPriceTier,
  type PricePalette,
  type PriceTier,
} from './price-palette.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APP = resolve(ROOT, '../../../../..');
const MANIFEST = resolve(ROOT, 'catalog/art-direction.json');
const CATALOGUE = resolve(ROOT, 'catalog/collector-crypt.json');
const PALETTE = resolve(ROOT, 'catalog/price-palette.json');
const TEMPLATE = resolve(ROOT, 'templates');
const RECIPE = resolve(ROOT, 'recipe-catalog.json');
const WIDTH = 1024;
const HEIGHT = 2048;
const ART = { left: 128, top: 448, width: 768, height: 832 };
const FOX = { left: 448, top: 288, width: 128, height: 128 };
const PNG_OPTIONS = { compressionLevel: 9, adaptiveFiltering: false } as const;
const WEBP_OPTIONS = {
  quality: 90,
  alphaQuality: 100,
  effort: 6,
  smartSubsample: true,
} as const;
const SHARED_PATHS = {
  mask: resolve(TEMPLATE, 'mask.png'),
  shadows: resolve(TEMPLATE, 'shadows.png'),
  highlights: resolve(TEMPLATE, 'highlights.png'),
  logo: resolve(APP, 'images/fox.svg'),
  mediumFont: resolve(APP, 'fonts/MMSans-Medium.otf'),
  boldFont: resolve(APP, 'fonts/MMSans-Bold.otf'),
  manifest: MANIFEST,
  prompt: resolve(ROOT, 'prompts/illustration.md'),
  catalogue: CATALOGUE,
  palette: PALETTE,
  selector: resolve(ROOT, 'tools/price-palette.ts'),
  script: fileURLToPath(import.meta.url),
};

interface PackArtwork {
  code: string;
  provider: 'collector-crypt' | 'gacha';
  category: string;
  displayName: string;
  slug: string;
  subject: string;
  source: string;
}

interface ArtDirection {
  prompt: string;
  packs: PackArtwork[];
}

interface PriceCatalogue {
  priceCurrency: 'USDC';
  packs: { code: string; price: number }[];
}

/** Returns the SHA-256 of archived source or output bytes. */
const sha256 = (bytes: Buffer): string =>
  createHash('sha256').update(bytes).digest('hex');

/** Records exact input bytes with paths relative to the packs directory. */
async function archiveInputs(paths: Record<string, string>) {
  const inputs: Record<string, { path: string; sha256: string }> = {};
  for (const [name, path] of Object.entries(paths)) {
    inputs[name] = {
      path: relative(ROOT, path),
      sha256: sha256(await readFile(path)),
    };
  }
  return inputs;
}

/** Records the settings and inputs shared by the complete catalogue. */
async function sharedRecipe() {
  return {
    inputs: await archiveInputs(SHARED_PATHS),
    canvas: { width: WIDTH, height: HEIGHT, colourspace: 'sRGB' },
    layout: {
      illustration: { ...ART, fit: 'contain', kernel: 'lanczos3' },
      logo: { ...FOX, fit: 'contain' },
      textColour: '#fff1e8',
      textPlacement: 'Measured ink centered; uppercase ink bottom at baseline',
      typography: 'Sharp text/Pango, 72 DPI, repository fonts only',
    },
    material: 'Approved shadow/highlight alpha; silhouette applied once last',
    software: {
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
      sharp: sharp.versions,
    },
    encoding: {
      png: PNG_OPTIONS,
      webp: WEBP_OPTIONS,
      list: { width: 384, height: 768, kernel: 'lanczos3' },
    },
  };
}

/** Typesets one uppercase label and measures its visible ink for centering. */
async function label(text: string, weight: 'Medium' | 'Bold', size: number) {
  const escapedText = text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
  return sharp({
    text: {
      text: `<span foreground="#fff1e8">${escapedText}</span>`,
      font: `MM Sans ${weight} ${size}`,
      fontfile: resolve(APP, `fonts/MMSans-${weight}.otf`),
      dpi: 72,
      rgba: true,
    },
  })
    .png(PNG_OPTIONS)
    .toBuffer({ resolveWithObject: true });
}

/** Composes printed artwork, then applies the approved material maps once. */
async function compose(
  pack: PackArtwork,
  price: number | null,
  tier: PriceTier,
) {
  const directory = dirname(resolve(ROOT, pack.source));
  const categoryText = pack.category.toUpperCase();
  const nameText = pack.displayName.toUpperCase();
  const paths = {
    illustration: resolve(ROOT, pack.source),
    ground: resolve(ROOT, tier.ground),
  };
  const inputs = await archiveInputs(paths);

  const source = await sharp(paths.illustration).metadata();
  if (!source.hasAlpha)
    throw new Error('The illustration needs a transparent background.');
  const sourcePixels = await sharp(paths.illustration)
    .toColourspace('srgb')
    .ensureAlpha()
    .raw()
    .toBuffer();
  let left = source.width;
  let top = source.height;
  let right = -1;
  let bottom = -1;
  // Trim only fully transparent padding; retain every translucent ember pixel.
  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < source.width; x++) {
      if (sourcePixels[(y * source.width + x) * 4 + 3] === 0) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left)
    throw new Error('The illustration is entirely transparent.');
  const crop = { left, top, width: right - left + 1, height: bottom - top + 1 };
  const illustration = await sharp(paths.illustration)
    .extract(crop)
    .resize(ART.width, ART.height, {
      fit: 'contain',
      kernel: 'lanczos3',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png(PNG_OPTIONS)
    .toBuffer();
  const fox = await sharp(SHARED_PATHS.logo)
    .resize(FOX.width, FOX.height, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png(PNG_OPTIONS)
    .toBuffer();
  const category = await label(categoryText, 'Medium', 52);
  const name = await label(nameText, 'Bold', 136);
  if (category.info.width > ART.width || name.info.width > ART.width)
    throw new Error(`Label too wide for ${pack.code}; choose a shorter name.`);
  const categoryPosition = {
    left: Math.round((WIDTH - category.info.width) / 2),
    top: 1408 - category.info.height,
  };
  const namePosition = {
    left: Math.round((WIDTH - name.info.width) / 2),
    top: 1552 - name.info.height,
  };

  const ground = await readFile(paths.ground);
  const printed = await sharp(ground)
    .composite([
      { input: illustration, left: ART.left, top: ART.top },
      { input: fox, left: FOX.left, top: FOX.top },
      { input: category.data, ...categoryPosition },
      { input: name.data, ...namePosition },
    ])
    .toColourspace('srgb')
    .ensureAlpha()
    .raw()
    .toBuffer();
  const maps = await Promise.all(
    [SHARED_PATHS.mask, SHARED_PATHS.shadows, SHARED_PATHS.highlights].map(
      async (path) => {
        const result = await sharp(path)
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        if (result.info.width !== WIDTH || result.info.height !== HEIGHT)
          throw new Error(`Unexpected material dimensions: ${path}`);
        return result.data;
      },
    ),
  );
  const [mask, shadows, highlights] = maps;
  for (let offset = 0; offset < printed.length; offset += 4) {
    const alpha = mask[offset + 3];
    const shadow = shadows[offset + 3] / 255;
    const highlight = highlights[offset + 3] / 255;
    for (let channel = 0; channel < 3; channel++) {
      printed[offset + channel] =
        alpha === 0
          ? 0
          : Math.round(
              printed[offset + channel] * (1 - shadow) * (1 - highlight) +
                255 * highlight,
            );
    }
    printed[offset + 3] = alpha;
  }

  const master = sharp(printed, {
    raw: { width: WIDTH, height: HEIGHT, channels: 4 },
  });
  const outputs: Record<string, { sha256: string; bytes: number }> = {};
  const exports = {
    'pack.png': await master.clone().png(PNG_OPTIONS).toBuffer(),
    'pack.webp': await master.clone().webp(WEBP_OPTIONS).toBuffer(),
    'pack-list.webp': await master
      .clone()
      .resize(384, 768, { kernel: 'lanczos3' })
      .webp(WEBP_OPTIONS)
      .toBuffer(),
  };
  for (const [filename, bytes] of Object.entries(exports)) {
    await writeFile(resolve(directory, filename), bytes);
    outputs[filename] = { sha256: sha256(bytes), bytes: bytes.length };
  }
  return {
    provider: pack.provider,
    slug: pack.slug,
    displayName: pack.displayName,
    category: pack.category,
    subject: pack.subject,
    pricing: { currency: 'USDC', amount: price, tier: tier.id },
    inputs,
    source: {
      width: source.width,
      height: source.height,
      hasAlpha: source.hasAlpha,
      crop,
      cropThreshold: 'alpha > 0',
    },
    layout: {
      category: {
        text: categoryText,
        size: 52,
        font: 'MM Sans Medium',
        ...categoryPosition,
        width: category.info.width,
        height: category.info.height,
      },
      name: {
        text: nameText,
        size: 136,
        font: 'MM Sans Bold',
        ...namePosition,
        width: name.info.width,
        height: name.info.height,
      },
    },
    outputs,
  };
}

/** Isolates Fontconfig from system fonts and keeps its cache temporary. */
async function main(): Promise<void> {
  const temporary = await mkdtemp(resolve(tmpdir(), 'gacha-pack-fonts-'));
  try {
    const configuration = resolve(temporary, 'fonts.conf');
    await writeFile(
      configuration,
      `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd"><fontconfig><dir>${resolve(APP, 'fonts')}</dir><cachedir>${temporary}</cachedir></fontconfig>`,
    );
    process.env.FONTCONFIG_FILE = configuration;
    const manifest: ArtDirection = JSON.parse(await readFile(MANIFEST, 'utf8'));
    const catalogue: PriceCatalogue = JSON.parse(
      await readFile(CATALOGUE, 'utf8'),
    );
    const palette: PricePalette = JSON.parse(await readFile(PALETTE, 'utf8'));
    if (catalogue.priceCurrency !== 'USDC' || palette.currency !== 'USDC')
      throw new Error('The artwork price palette requires prices in USDC.');
    const codes = process.argv.slice(2);
    for (const code of codes) {
      if (!manifest.packs.some((pack) => pack.code === code))
        throw new Error(`Unknown pack code: ${code}`);
    }
    const selected = manifest.packs.filter(
      (pack) => codes.length === 0 || codes.includes(pack.code),
    );
    const missing = selected.filter(
      (pack) => !existsSync(resolve(ROOT, pack.source)),
    );
    if (missing.length > 0)
      throw new Error(
        `Missing illustration sources: ${missing.map((pack) => pack.code).join(', ')}`,
      );
    const shared = await sharedRecipe();
    let packs: Record<string, Awaited<ReturnType<typeof compose>>> = {};
    if (codes.length > 0) {
      if (!existsSync(RECIPE))
        throw new Error(
          'A partial render requires recipe-catalog.json. Run a full rebuild first.',
        );
      const previous: { shared: typeof shared; packs: typeof packs } =
        JSON.parse(await readFile(RECIPE, 'utf8'));
      if (!isDeepStrictEqual(previous.shared, shared))
        throw new Error(
          'Shared recipe settings or inputs changed. Run a full rebuild.',
        );
      if (
        !previous.packs ||
        Object.keys(previous.packs).length !== manifest.packs.length ||
        manifest.packs.some((pack) => !previous.packs[pack.code])
      )
        throw new Error(
          'The existing recipe catalogue is incomplete. Run a full rebuild.',
        );
      packs = previous.packs;
    }
    for (const pack of selected) {
      const isDefault = pack.provider === 'gacha' && pack.code === 'default';
      const price = isDefault
        ? null
        : catalogue.packs.find((item) => item.code === pack.code)?.price;
      if (price === undefined)
        throw new Error(`Missing catalogue price for ${pack.code}.`);
      const tier = selectPriceTier(price, palette);
      packs[pack.code] = await compose(pack, price, tier);
      process.stdout.write(`RENDERED ${pack.code}: ${tier.id}\n`);
    }
    const recipeTemporary = `${RECIPE}.tmp`;
    await writeFile(
      recipeTemporary,
      `${JSON.stringify({ shared, packs }, null, 2)}\n`,
    );
    await rename(recipeTemporary, RECIPE);
    process.stdout.write(
      `Updated recipe-catalog.json (${Object.keys(packs).length} packs).\n`,
    );
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
