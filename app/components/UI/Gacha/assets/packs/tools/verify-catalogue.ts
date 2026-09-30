/** Offline catalogue verification. Never import this script into the app. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { selectPriceTier } from './price-palette.ts';
import type { PricePalette } from './price-palette.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APP = resolve(ROOT, '../../../../..');
const WIDTH = 1024;
const HEIGHT = 2048;
const EXPORTS = {
  'pack.png': { width: WIDTH, height: HEIGHT },
  'pack.webp': { width: WIDTH, height: HEIGHT },
  'pack-list.webp': { width: 384, height: 768 },
};

interface PackArtwork {
  code: string;
  provider: string;
  slug: string;
  category: string;
  displayName: string;
  source: string;
}

interface Rectangle {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface PrintedLabel extends Rectangle {
  text: string;
  size: number;
  font: string;
}

interface Input {
  path: string;
  sha256: string;
}

interface PackRecipe {
  provider: string;
  slug: string;
  displayName: string;
  category: string;
  pricing: { currency: string; amount: number | null; tier: string };
  inputs: Record<string, Input>;
  outputs: Record<string, { sha256: string; bytes: number }>;
  layout: {
    category: PrintedLabel;
    name: PrintedLabel;
  };
}

interface RecipeCatalogue {
  shared: {
    inputs: Record<string, Input>;
    canvas: { width: number; height: number; colourspace: string };
    layout: { illustration: Rectangle; logo: Rectangle };
  };
  packs: Record<string, PackRecipe>;
}

interface GenerationCatalogue {
  packs: Record<
    string,
    {
      displayName: string;
      originalPromptTextSha256: string;
      source: Input;
    }
  >;
}

/** Returns the hash used by the archived composition recipes. */
const sha256 = (bytes: Buffer): string =>
  createHash('sha256').update(bytes).digest('hex');

/** Resolves archived input paths from the pack-assets root and verifies bytes. */
async function verifyInputs(
  inputs: Record<string, Input>,
  expectedPaths: Record<string, string>,
  context: string,
): Promise<void> {
  for (const [name, path] of Object.entries(expectedPaths)) {
    assert.ok(inputs[name], `${context}: missing input ${name}`);
    assert.equal(
      resolve(ROOT, inputs[name].path),
      resolve(ROOT, path),
      `${context}: ${name} path`,
    );
  }
  for (const [name, input] of Object.entries(inputs)) {
    assert.equal(
      sha256(await readFile(resolve(ROOT, input.path))),
      input.sha256,
      `${context}: stale input hash for ${name}`,
    );
  }
}

/** Checks every inclusive/exclusive price boundary independently of recipes. */
function verifyPriceBoundaries(palette: PricePalette): void {
  assert.equal(palette.currency, 'USDC');
  assert.deepEqual(
    palette.tiers.map(({ upperBound, inclusive }) => [upperBound, inclusive]),
    [
      [50, true],
      [250, true],
      [500, false],
      [1000, true],
      [null, false],
    ],
    'Palette must preserve the approved five price ranges.',
  );
  assert.equal(palette.defaultTier, palette.tiers[0].id);
  for (const [price, index] of [
    [null, 0],
    [0, 0],
    [50, 0],
    [50.01, 1],
    [250, 1],
    [250.01, 2],
    [499.99, 2],
    [500, 3],
    [1000, 3],
    [1000.01, 4],
  ] as const) {
    assert.equal(
      selectPriceTier(price, palette).id,
      palette.tiers[index].id,
      `Incorrect tier at price ${price}.`,
    );
  }
  for (const price of [-1, NaN, Infinity, -Infinity])
    assert.throws(() => selectPriceTier(price, palette));
}

/** Checks catalogue completeness, recipes and the approved shared appearance. */
async function main(): Promise<void> {
  const manifest: { prompt: string; packs: PackArtwork[] } = JSON.parse(
    await readFile(resolve(ROOT, 'catalog/art-direction.json'), 'utf8'),
  );
  const catalogue: {
    priceCurrency: string;
    packs: { code: string; public: boolean; price: number }[];
  } = JSON.parse(
    await readFile(resolve(ROOT, 'catalog/collector-crypt.json'), 'utf8'),
  );
  const palette: PricePalette = JSON.parse(
    await readFile(resolve(ROOT, 'catalog/price-palette.json'), 'utf8'),
  );
  const recipes: RecipeCatalogue = JSON.parse(
    await readFile(resolve(ROOT, 'recipe-catalog.json'), 'utf8'),
  );
  const generations: GenerationCatalogue = JSON.parse(
    await readFile(resolve(ROOT, 'catalog.generation.json'), 'utf8'),
  );
  verifyPriceBoundaries(palette);
  assert.equal(catalogue.priceCurrency, palette.currency);
  assert.equal(
    manifest.packs.length,
    31,
    'Expected 30 public packs plus default.',
  );
  assert.equal(new Set(manifest.packs.map((pack) => pack.code)).size, 31);
  const manifestCodes = manifest.packs.map(({ code }) => code).sort();
  assert.deepEqual(Object.keys(recipes.packs).sort(), manifestCodes);
  assert.deepEqual(Object.keys(generations.packs).sort(), manifestCodes);
  const publicCodes = catalogue.packs
    .filter((pack) => pack.public)
    .map((pack) => pack.code)
    .sort();
  assert.equal(publicCodes.length, 30);
  assert.deepEqual(
    manifest.packs
      .filter((pack) => pack.provider === 'collector-crypt')
      .map((pack) => pack.code)
      .sort(),
    publicCodes,
    'Manifest must cover exactly the public Collector Crypt codes.',
  );
  assert.deepEqual(
    manifest.packs
      .filter((pack) => pack.provider !== 'collector-crypt')
      .map((pack) => [pack.provider, pack.code]),
    [['gacha', 'default']],
  );

  const missing: string[] = [];
  for (const pack of manifest.packs) {
    const directory = dirname(resolve(ROOT, pack.source));
    for (const path of [
      resolve(ROOT, pack.source),
      resolve(directory, 'pack.webp'),
      resolve(directory, 'pack-list.webp'),
    ]) {
      if (!existsSync(path)) missing.push(`${pack.code}: ${path}`);
    }
  }
  assert.equal(
    missing.length,
    0,
    `Missing catalogue files:\n${missing.join('\n')}`,
  );

  await verifyInputs(
    recipes.shared.inputs,
    {
      mask: 'templates/mask.png',
      shadows: 'templates/shadows.png',
      highlights: 'templates/highlights.png',
      logo: resolve(APP, 'images/fox.svg'),
      mediumFont: resolve(APP, 'fonts/MMSans-Medium.otf'),
      boldFont: resolve(APP, 'fonts/MMSans-Bold.otf'),
      prompt: 'prompts/illustration.md',
      script: 'tools/compose-packs.ts',
      manifest: 'catalog/art-direction.json',
      palette: 'catalog/price-palette.json',
      catalogue: 'catalog/collector-crypt.json',
      selector: 'tools/price-palette.ts',
    },
    'Shared recipe',
  );
  assert.equal(manifest.prompt, 'prompts/illustration.md');
  const promptDocument = await readFile(resolve(ROOT, manifest.prompt), 'utf8');
  const prompt = promptDocument.match(/```text\n([\s\S]*?)\n```/u)?.[1];
  assert.ok(prompt, 'The shared illustration prompt needs a text code block.');
  assert.deepEqual(
    prompt.match(/\{\{[^{}]+\}\}/gu),
    ['{{subject}}'],
    'The shared illustration prompt must contain only one subject placeholder.',
  );
  assert.deepEqual(recipes.shared.canvas, {
    width: WIDTH,
    height: HEIGHT,
    colourspace: 'sRGB',
  });
  for (const [key, expected] of [
    ['illustration', { left: 128, top: 448, width: 768, height: 832 }],
    ['logo', { left: 448, top: 288, width: 128, height: 128 }],
  ] as const) {
    const { left, top, width, height } = recipes.shared.layout[key];
    assert.deepEqual({ left, top, width, height }, expected, `Shared ${key}`);
  }

  const mask = await sharp(resolve(ROOT, 'templates/mask.png'))
    .ensureAlpha()
    .raw()
    .toBuffer();
  const fox = await sharp(resolve(APP, 'images/fox.svg'))
    .resize(128, 128, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .raw()
    .toBuffer();
  const tierReferences = new Map<string, Buffer>();
  const illustrationHashes = new Map<string, string>();
  const exportHashes = new Set<string>();
  let reference: Buffer | undefined;
  let pixelChecks = 0;
  let tierComparisons = 0;
  let outputBytes = 0;
  for (const pack of manifest.packs) {
    const directory = dirname(resolve(ROOT, pack.source));
    const recipe = recipes.packs[pack.code];
    assert.equal(recipe.provider, pack.provider);
    assert.equal(recipe.slug, pack.slug);
    assert.equal(recipe.displayName, pack.displayName);
    assert.equal(recipe.category, pack.category);
    const machine = catalogue.packs.find(({ code }) => code === pack.code);
    let amount: number | null = null;
    if (pack.provider === 'collector-crypt') {
      assert.ok(machine, `${pack.code}: missing catalogue price`);
      amount = machine.price;
    }
    const tier = selectPriceTier(amount, palette);
    assert.deepEqual(recipe.pricing, {
      currency: palette.currency,
      amount,
      tier: tier.id,
    });

    await verifyInputs(
      recipe.inputs,
      { illustration: pack.source, ground: tier.ground },
      pack.code,
    );
    const sourceHash = recipe.inputs.illustration.sha256;
    const generation = generations.packs[pack.code];
    assert.equal(generation.displayName, pack.displayName);
    assert.equal(
      resolve(ROOT, generation.source.path),
      resolve(ROOT, pack.source),
    );
    assert.match(
      generation.originalPromptTextSha256,
      /^[a-f0-9]{64}$/u,
      `${pack.code}: original executed prompt hash missing`,
    );
    assert.equal(
      sourceHash,
      generation.source.sha256,
      `${pack.code}: original generated illustration changed`,
    );
    assert.ok(
      !illustrationHashes.has(sourceHash),
      `${pack.code}: duplicate illustration of ${illustrationHashes.get(sourceHash)}`,
    );
    illustrationHashes.set(sourceHash, pack.code);

    for (const [name, dimensions] of Object.entries(EXPORTS)) {
      assert.ok(recipe.outputs[name], `${pack.code}: missing ${name} recipe`);
      const path = resolve(directory, name);
      if (name === 'pack.png' && !existsSync(path)) continue;
      const bytes = await readFile(path);
      const outputHash = sha256(bytes);
      assert.equal(
        outputHash,
        recipe.outputs[name]?.sha256,
        `${pack.code}: ${name} hash`,
      );
      assert.ok(
        !exportHashes.has(outputHash),
        `${pack.code}: duplicate export ${name}`,
      );
      exportHashes.add(outputHash);
      assert.equal(
        bytes.length,
        recipe.outputs[name]?.bytes,
        `${pack.code}: ${name} byte count`,
      );
      const metadata = await sharp(bytes).metadata();
      assert.equal(
        metadata.width,
        dimensions.width,
        `${pack.code}: ${name} width`,
      );
      assert.equal(
        metadata.height,
        dimensions.height,
        `${pack.code}: ${name} height`,
      );
      assert.ok(metadata.hasAlpha, `${pack.code}: ${name} needs alpha`);
      outputBytes += bytes.length;
    }

    for (const [key, size, bottom, text, font] of [
      ['category', 52, 1408, pack.category, 'MM Sans Medium'],
      ['name', 136, 1552, pack.displayName, 'MM Sans Bold'],
    ] as const) {
      const label = recipe.layout[key];
      assert.equal(label.text, text.toUpperCase(), `${pack.code}: ${key} text`);
      assert.equal(label.size, size, `${pack.code}: ${key} size`);
      assert.equal(label.font, font, `${pack.code}: ${key} font`);
      assert.ok(
        label.width > 0 && label.width <= 768,
        `${pack.code}: ${key} width`,
      );
      assert.equal(
        label.left,
        Math.round((WIDTH - label.width) / 2),
        `${pack.code}: ${key} center`,
      );
      assert.equal(
        label.top + label.height,
        bottom,
        `${pack.code}: ${key} ink bottom`,
      );
    }

    const pngPath = resolve(directory, 'pack.png');
    if (!existsSync(pngPath)) continue;
    const pixels = await sharp(pngPath).ensureAlpha().raw().toBuffer();
    reference ??= pixels;
    pixelChecks++;
    if (tierReferences.has(tier.id)) tierComparisons++;
    const tierReference = tierReferences.get(tier.id) ?? pixels;
    tierReferences.set(tier.id, tierReference);
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        const offset = (y * WIDTH + x) * 4;
        if (pixels[offset + 3] !== mask[offset + 3])
          throw new Error(`${pack.code}: silhouette differs at ${x},${y}`);
        // Transparent fox corners expose the recoloured ground legitimately.
        const onOpaqueFox =
          x >= 448 &&
          x < 576 &&
          y >= 288 &&
          y < 416 &&
          fox[((y - 288) * 128 + x - 448) * 4 + 3] === 255;
        if (
          onOpaqueFox &&
          pixels.readUInt32LE(offset) !== reference.readUInt32LE(offset)
        )
          throw new Error(`${pack.code}: official fox differs at ${x},${y}`);
        const variable =
          x >= 128 &&
          x < 896 &&
          ((y >= 448 && y < 1280) || (y >= 1320 && y < 1552));
        if (
          !variable &&
          pixels.readUInt32LE(offset) !== tierReference.readUInt32LE(offset)
        )
          throw new Error(
            `${pack.code}: shared ${tier.id} ground differs at ${x},${y}`,
          );
      }
    }
  }
  process.stdout.write(
    `PASS: 31 unchanged unique illustrations; shared prompt and historical prompt hash records; 30 public codes + default; price boundaries, palette selection, shared/per-pack input hashes, typography and all 62 WebP hashes/dimensions/alpha metadata verified.\n${exportHashes.size} present exports checked: ${outputBytes} bytes.\nExact PNG pixel checks: ${pixelChecks}/31 present masters; ${31 - pixelChecks} skipped (not stored in Git). Same-tier ground comparisons: ${tierComparisons}; opaque fox comparisons: ${Math.max(0, pixelChecks - 1)}.\n`,
  );
  if (pixelChecks < 31)
    process.stdout.write(
      'Run yarn node app/components/UI/Gacha/assets/packs/tools/compose-packs.ts to recreate all PNG masters, then rerun this verifier for complete exact pixel checks.\n',
    );
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
