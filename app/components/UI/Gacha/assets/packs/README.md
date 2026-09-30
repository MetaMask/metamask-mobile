# Gacha pack artwork

This catalogue contains **30 public Collector Crypt packs plus Origin**, the provider-independent default. Each pack has an original transparent illustration and two composed WebP exports. All packs share the pouch geometry, material lighting and typography; the printed ground follows five global price bands. The top of each pouch carries only its ground colour and material lighting, with no logo, medallion or reserved badge area.

Git keeps the artwork history. Keep sources and runtime exports in Git; large review images are generated locally and ignored. The app displays the small exports in its two-column pack list and full-size exports in purchase confirmation.

## Files

| Path                                                  | Purpose                                                                                                           | Git                |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------ |
| `artwork/<slug>/source.png`                           | Unmodified transparent illustration from the image generator                                                      | Commit             |
| `artwork/<slug>/pack.webp`                            | Composed 1024 × 2048 export                                                                                       | Commit             |
| `artwork/<slug>/pack-list.webp`                       | Composed 384 × 768 list export                                                                                    | Commit             |
| `artwork/<slug>/pack.png`                             | Lossless 1024 × 2048 review master                                                                                | Ignore; regenerate |
| `templates/source.png`                                | Unmodified generated blank pouch                                                                                  | Commit             |
| `templates/mask.png`, `shadows.png`, `highlights.png` | Shared silhouette and material maps                                                                               | Commit             |
| `templates/printed-ground-usdc-*.svg`                 | Five price-dependent printed grounds                                                                              | Commit             |
| `templates/recipe.json`                               | Blank-source crop, normalization, material extraction and hashes                                                  | Commit             |
| `templates/template.png`                              | Normalized grayscale pouch preview                                                                                | Ignore; regenerate |
| `prompts/illustration.md`                             | Common illustration prompt; `{{subject}}` is the only varying request                                             | Commit             |
| `prompts/template.md`                                 | Separate prompt for the blank pouch                                                                               | Commit             |
| `catalog.generation.json`                             | Shared generation metadata and per-pack source hashes, original prompt hashes, output references and alpha audits | Commit             |
| `recipe-catalog.json`                                 | Shared rendering configuration/input hashes and per-pack pricing, inputs, layout and output hashes                | Commit             |
| `catalog/collector-crypt.json`                        | Dated public API inventory and prices                                                                             | Commit             |
| `catalog/art-direction.json`                          | Shared illustration prompt path and provider/code → name, category, subject and source mapping                    | Commit             |
| `catalog/price-palette.json`                          | Ordered price bands, default band and SVG paths                                                                   | Commit             |
| `tools/`                                              | Offline template preparation, composition, palette selection, preview and verification                            | Commit             |
| `previews/catalogue.jpg`                              | Complete catalogue contact sheet                                                                                  | Ignore; regenerate |

Paths in the central generation and recipe catalogues are relative to this directory. Paths in `templates/recipe.json` are relative to `templates/`. A source illustration and its composed pack are different images: retain the source to rebuild or recolour the pack without generating new artwork.

## Rebuild and verify

Use Node **24.16.0**, repository Yarn **4.14.1** and the locked dependencies. From the repository root:

```sh
# Print one exact expanded illustration prompt; this does not call AI.
yarn node app/components/UI/Gacha/assets/packs/tools/print-prompt.ts pokemon_50

# Compose all packs, or only the listed stable codes.
yarn node app/components/UI/Gacha/assets/packs/tools/compose-packs.ts
yarn node app/components/UI/Gacha/assets/packs/tools/compose-packs.ts pokemon_50 default

# Verify committed assets; include deeper pixel checks when local PNGs exist.
yarn node app/components/UI/Gacha/assets/packs/tools/verify-catalogue.ts

# Build the local contact sheet from all 31 HD WebPs.
yarn node app/components/UI/Gacha/assets/packs/tools/preview-catalogue.ts

# Rebuild shared material maps and the local grayscale preview when needed.
yarn node app/components/UI/Gacha/assets/packs/tools/prepare-template.ts
```

Composition writes each selected pack's PNG and both WebPs, then updates the central recipe. It preserves illustration sources, generation prompts and provenance. Use the general compositor for Ember as for every other pack. Template preparation is unnecessary for colour-only changes.

A partial rebuild requires a complete existing recipe with identical shared settings and input hashes. If the template, palette, manifest, prompt, renderer or other shared input changes, rebuild all packs first. The central recipe is replaced only after the selected batch succeeds.

The verifier works in a clean checkout without ignored PNGs. It checks catalogue coverage, unique illustrations/exports, generation and recipe hashes, price/ground selection, export dimensions and fixed typography placement. When local pack PNGs are present, it also checks their hashes, exact silhouette alpha, shared ground pixels within each price band and that the former logo area contains only the ground with material lighting. Run composition for all packs before verification to exercise every lossless pixel check. Verification never rewrites assets.

The preview requires every HD WebP and reports missing files. Its 1320 × 2892 JPEG has six 220 px columns, 200 × 400 pack images, name/code labels and a dark neutral background. Inspect small exports on light and dark backgrounds for halos, seams and legibility.

For a byte-identical rebuild, retain the sources, prompts, catalogues, selected SVGs, material maps, fonts and recorded renderer versions. Compare output hashes with the **previous committed recipe**, not the recipe just regenerated. A changed encoder can alter bytes even when decoded pixels look identical. No AI generation is involved in composition or recolouring.

## Shared illustration prompt

`catalog/art-direction.json` points to `prompts/illustration.md` once, through its root `prompt` property. Each pack supplies only its `subject`. `print-prompt.ts <code>` substitutes that value for `{{subject}}` in the common prompt block and writes the exact expanded text to stdout. Only the Primary request varies; there are no per-pack prompt files. The separate `prompts/template.md` describes the blank pouch.

`recipe-catalog.json` records the common prompt file hash once in `shared.inputs.prompt`. In `catalog.generation.json`, each pack's `originalPromptTextSha256` records the historical prompt used to generate its existing source. Those sources predate prompt unification, including Ember's earlier prompt; `shared.promptHistory` explains this distinction. The new common prompt is for future illustration generation. Consolidation preserves every source image and performs no AI regeneration.

The current prompts describe packs without a logo or medallion. The archived illustration sources and blank pouch source remain unchanged. `templates/recipe.json` retains the original template-generation prompt hash; it is historical provenance, not the hash of the revised `prompts/template.md`, which guides future generation. `prepare-template.ts` preserves that historical hash whenever the source bytes are unchanged.

New AI artwork is a separate candidate requiring visual review. A prompt cannot reproduce identical pixels: `image_gen.imagegen` did not expose its model version or seed. Preserve source bytes and record accepted changes through Git.

## Price bands

`catalog/price-palette.json` defines a global scale across all collections. Prices come from `catalog/collector-crypt.json`, joined by stable pack code; offline tools do not fetch live prices or infer them from names.

| Price in USDC          | Ground colour   | SVG in `templates/`                        |
| ---------------------- | --------------- | ------------------------------------------ |
| ≤ 50                   | Silver grey     | `printed-ground-usdc-lte-50.svg`           |
| > 50 and ≤ 250         | Light copper    | `printed-ground-usdc-gt-50-lte-250.svg`    |
| > 250 and < 500        | Moderate orange | `printed-ground-usdc-gt-250-lt-500.svg`    |
| 500 to 1,000 inclusive | Intense orange  | `printed-ground-usdc-gte-500-lte-1000.svg` |
| > 1,000                | Copper red      | `printed-ground-usdc-gt-1000.svg`          |

The selector uses the first matching upper bound and rejects negative or non-finite prices. Only Origin has a `null` price; it uses the grey default band. The current catalogue has 6 grey packs including Origin, 18 light copper, 5 intense orange and 2 copper red. The moderate-orange band is ready for future prices between 250 and 500 USDC.

Only gradient stops and radial-glow colours vary between SVGs. The short title rule remains shared; there are no logos, medallions, reserved badge areas or side chevrons. Illustrations retain their original colours beneath the common material lighting. A price or palette change requires recomposition and verification; each pack has one precomposed colour in two WebP sizes.

## Geometry and material

The canvas is **1024 × 2048**, sRGB, transparent outside the pouch. The blank source is 887 × 1774. Normalize its visible bounds (alpha > 8) into **x=64, y=128, width=896, height=1792**, using Lanczos3 with `fit: fill`. After resizing, alpha ≤8 becomes 0, alpha ≥250 becomes 255, intermediate coverage stays unchanged and RGB outside the mask becomes zero.

The approved pouch is upright and frontal, with no visible back, perspective or external drop shadow. Its flexible metallized body has a gently inflated face, subtle side folds and fine vertical crimp ridges across horizontal seals, roughly 7% of pouch height at each end. The material has a satin midtone centre, dark perimeter creases and silver highlights from a broad upper-left key and subtler right reflection. Reuse these pixels for every pack.

All material calculations use **sRGB-encoded channels**, not linear-light values:

1. Convert the normalized source to grayscale: `round(0.2126 R + 0.7152 G + 0.0722 B)`; preserve alpha.
2. Let `L` be grayscale / 255. Let `M` be median grayscale / 255 in **x=320..703, y=512..1279**; its recorded value is `0.4823529411764706`.
3. Black shadow opacity: `S = round(255 × max(0, 1 − L/M)) / 255`.
4. White highlight opacity: `H = round(255 × max(0, (L−M)/(1−M))) / 255`.
5. Compose the opaque printed ground, illustration and text into `C`, then calculate each channel: **`Cout = round(C × (1−S) × (1−H) + 255 × H)`**.
6. Apply silhouette alpha once, at the end. Repeated masking erodes the outline.

Foil geometry, folds and typography are composed deterministically. Generating them separately for each illustration or fading an illustration over a silver bitmap would change the approved appearance.

## Layout and export settings

Coordinates use the normalized canvas:

| Element      | Placement                                                         |
| ------------ | ----------------------------------------------------------------- |
| Illustration | x=128, y=448, width=768, height=832; contain fit                  |
| Category     | Centred x=512; ink bottom y=1408; 52 px MM Sans Medium, uppercase |
| Pack name    | Centred x=512; ink bottom y=1552; 136 px MM Sans Bold, uppercase  |

Illustrations are cropped only where alpha is zero, preserving translucent details, then resized with Lanczos3. Both text sizes are fixed, with a maximum measured width of 768 px; the compositor rejects longer labels instead of shrinking them. Centre measured glyph bounds. Ink-bottom coordinates include accents such as É and are not font baselines. Text is `#fff1e8` before material lighting; there is no footer.

Use `app/fonts/MMSans-{Medium,Bold}.otf`, whose hashes are recorded in the central recipe. Typography uses Sharp text/Pango **1.57.0**, Fontconfig **2.17.1**, FreeType **2.14.1** and HarfBuzz **12.1.0**, at **72 DPI**. A temporary Fontconfig configuration isolates repository fonts from installed system fonts.

The intense-orange SVG's vertical gradient is **0% `#ff7940`, 28% `#e65b28`, 58% `#b54018`, 84% `#652516`, 100% `#bb4a25`**. All bands use a radial glow centred at (512,856), radii (432,516), maximum opacity 0.2. Exact colours live in the five SVGs. Printed details sit beneath the material maps without adding a second foil reflection.

Rendering uses Sharp **0.34.5**, libvips **8.17.3**, libwebp **1.6.0** and libpng **1.6.50**; complete native versions and platform are recorded in the recipes. WebP settings are `quality: 90`, `alphaQuality: 100`, `effort: 6`, `smartSubsample: true`. PNG settings are `compressionLevel: 9`, `adaptiveFiltering: false`. The list export uses Lanczos3 at **384 × 768**. Preserve shared padding and transparency in both sizes.

## Catalogue and runtime integration

The retained public API snapshot is dated **2026-09-30** and covers 30 public packs, including one closed pack. It is an authoring inventory, not live availability or pricing. Refresh both `/api/machines` and `/api/status` on `gacha.collectorcrypt.com` before extending it, and compare stable codes and metadata.

`catalog/art-direction.json` maps each provider/code pair explicitly to its artwork; for example, `collector-crypt` / `pokemon_25` maps to Ember. The original code remains the purchase identifier. Printed categories such as BASEBALL or WATCHES do not replace API categories.

`gacha` / `default` maps to Origin at `artwork/default-origin/`: a faceted amber crystal with an ivory core, copper orbit and geometric shards, labelled GACHA / ORIGIN. Unknown codes use Origin while keeping native names, categories and prices from the API. Do not infer artwork from array order, price alone or translated names, or bake prices, odds, insured values, card counts or rarity claims into the image.

`index.ts` exposes `getCollectorCryptPackArtwork(code)`, with explicit static asset references for Metro. It returns a display name, a `thumbnail` (384 × 768) and an `image` (1024 × 2048). `PackCard` uses the thumbnail; `PackPurchaseSheet` uses the image. New codes fall back to Origin with no replacement name, so both components retain the API name. Curated names never replace the code or name sent to the provider when purchasing.

After accepting artwork for a new pack, add its code, readable display name and both WebP paths to `index.ts`. Its unit test checks coverage against the authoring catalogue. Prices, availability and purchase data remain live; this lookup contains only presentation assets.

All tools in this directory are offline authoring tools; do not import them or the authoring JSON catalogues into mobile components. The runtime consumes flat WebPs through the installed design system image component, with no live material renderer or new dependency.
