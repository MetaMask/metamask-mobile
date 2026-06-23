# ESLint Performance Investigation — Report

**Repo:** `metamask-mobile`
**Branch:** `main`
**Date:** 2026-06-23
**ESLint version:** `v8.57.1`
**Machine:** local dev (Apple Silicon), `NODE_OPTIONS=--max-old-space-size=12288`

---

## Methodology

All numbers are **cold, full-repo** runs unless stated otherwise:

```bash
# ESLint prints no timing by default, so wrap it in `/usr/bin/time -p`
# (prints real/user/sys). `--no-cache` forces a cold run like CI.
rm -f .eslintcache
NODE_OPTIONS='--max-old-space-size=12288' \
  /usr/bin/time -p yarn eslint '**/*.{js,ts,tsx}' --no-cache
```

---

## Baseline (current `main`)

| Run                          | Time        | Warnings shown | vs baseline |
| ---------------------------- | ----------- | -------------- | ----------- |
| `main` (type-aware, current) | **331.16s** | 6,049          | —           |

---

## Experiment 1 — Does `--quiet` help?

**Hypothesis:** printing ~6K warnings is slowing the pipeline.

**Run** (uses the real `.eslintrc.js`, just adds `--quiet`):

```bash
NODE_OPTIONS='--max-old-space-size=12288' \
  /usr/bin/time -p yarn eslint '**/*.{js,ts,tsx}' --quiet --no-cache
```

| Run                     | Time        | Warnings shown | vs baseline        |
| ----------------------- | ----------- | -------------- | ------------------ |
| baseline (no `--quiet`) | 331.16s     | 6,049          | —                  |
| `--quiet`               | **326.55s** | 0              | ~1% faster (noise) |

**Result: ❌ No meaningful improvement** (~4.6s / ~1.4%, within noise).

**Why:** On **ESLint v8.57.1**, `--quiet` only filters warnings out of the
_output_. It still runs every `warn`-level rule (including the type-aware
`no-deprecated`) and still builds the TS program — so the cost is the work, not
the printing.

ESLint v9's `--quiet` preemptively downgrades `warn` → `off` to skip those rules ([migration notes](https://eslint.org/docs/latest/use/migrate-to-9.0.0#---quiet-no-longer-runs-rules-set-to-warn)).
Unclear if that's behaviour we want.

---

## Experiment 2 — Swap `@typescript-eslint/no-deprecated` → `import-x/no-deprecated`

**Hypothesis:** replacing the type-aware deprecation rule with the non-type-aware
`import-x/no-deprecated` cuts lint time while keeping deprecation coverage —
**without** touching `parserOptions.project`, so all other type-aware rules stay on.

> The repo uses `eslint-plugin-import-x`, so the rule is `import-x/no-deprecated`
> (not `import/no-deprecated`). It's resolver-based — reads `@deprecated` JSDoc,
> needs no type info.

**Run** (config: [`.eslintrc.import-x-no-deprecated.js`](./.eslintrc.import-x-no-deprecated.js)):

```bash
NODE_OPTIONS='--max-old-space-size=12288' \
  /usr/bin/time -p yarn eslint '**/*.{js,ts,tsx}' \
  --no-eslintrc -c .eslintrc.import-x-no-deprecated.js --no-cache
```

### Timing

| Run                   | Time        | Warnings shown | vs baseline             |
| --------------------- | ----------- | -------------- | ----------------------- |
| baseline (type-aware) | 331.16s     | 6,049          | —                       |
| swap, keep `project`  | **222.90s** | 1,971          | **~33% faster (1.49x)** |

**Result: ✅ ~33% faster**, and clean — of the 1,971 warnings, 1,464 are
`import-x/no-deprecated` flags and **0** are parse-error noise (with
`import-x/ignore: ['node_modules']`). Baseline's ~5.7K `no-deprecated` warnings
are gone, replaced by the leaner resolver-based count.

It is important to flag the decrease in warnings shown. This probably indicates a lot of type level deprecations are missing.

### Functional verification (same `.ts/.tsx` sample, both rules)

| Behaviour                                                                   | `@typescript-eslint/no-deprecated` | `import-x/no-deprecated`                      |
| --------------------------------------------------------------------------- | ---------------------------------- | --------------------------------------------- |
| BN.js number deprecations (`fromWei`, `isBN`, `renderFromWei`, `toGwei`, …) | ✅                                 | ✅ (flags import line **and** each usage)     |
| Runs on `.js` files                                                         | ❌ (only in `*.{ts,tsx}` override) | ✅ (registered at root)                       |
| `@deprecated` on typed libs (`Card`/`Text`/`Avatar` from design-system)     | ✅                                 | ❌ (can't resolve/parse those modules' JSDoc) |
| Needs `parserOptions.project` (the expensive bit)                           | ✅                                 | ❌                                            |

---

## Experiment 3 — Remove type-aware linting (drop `parserOptions.project`)

**Hypothesis:** the dominant cost is the whole-project TypeScript program build
forced by `parserOptions.project`. Dropping it (and all type-aware rules) should
hit the lint floor.

**Run** (config: [`.eslintrc.no-type-aware.js`](./.eslintrc.no-type-aware.js)):

```bash
NODE_OPTIONS='--max-old-space-size=12288' \
  /usr/bin/time -p yarn eslint '**/*.{js,ts,tsx}' \
  --no-eslintrc -c .eslintrc.no-type-aware.js --no-cache
```

### Timing

| Run                            | Time        | Warnings shown | vs baseline             |
| ------------------------------ | ----------- | -------------- | ----------------------- |
| baseline (type-aware)          | 331.16s     | 6,049          | —                       |
| drop `project` (no type-aware) | **172.93s** | 511            | **~48% faster (1.92x)** |

**Result: ✅ ~48% faster** — and this is the floor (~173s). It's the irreducible
non-type-aware cost (import resolution, react, `import-x/order`, jsdoc, tailwind
across ~12K files). You can't go lower cold without cutting more rules.

**⚠️ Danger:** this disables **all** type-aware rules, not just `no-deprecated`.
Files that genuinely need them (the perps `*-method-action-types*.ts`
Core-alignment files) must be re-scoped to a minimal tsconfig to keep working.

---

## Options compared (cold, full repo)

| #   | Option                                                                                                                    | Cold lint | Δ vs 331s baseline | Notes                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------ | ----------------------------------------------------------------------------------------------- |
| 1   | **Base** — `main` today (type-aware `no-deprecated`)                                                                      | 331s      | —                  | 6K warnings, needs `project`                                                                    |
| 2   | **`--quiet`**                                                                                                             | 327s      | ~1%                | no real win on ESLint v8 (output-only filter)                                                   |
| 3   | **Swap to `import-x/no-deprecated`** (keep `project`)                                                                     | 223s      | ~33%               | low-risk; keeps all other type-aware rules; needs `import-x/ignore`; loses lib `@deprecated`    |
| 4   | **My branch — remove `no-deprecated` + bash burndown** ([#32262](https://github.com/MetaMask/metamask-mobile/pull/32262)) | ~221s     | ~33%               | keeps `project`; replaces rule with `bn-migration-burndown.sh`; no eslint deprecation surfacing |
| 5   | **(⚠️ danger) Full type-aware removal** (drop `project`)                                                                  | ~173s     | ~48%               | biggest cold win; disables ALL type-aware rules                                                 |
