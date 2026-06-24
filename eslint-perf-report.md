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
| baseline (type-aware) | 304.97s     | 6,049          | —                       |
| swap, keep `project`  | **228.85s** | 1,991          | **~25% faster (1.33x)** |

**Result: ✅ ~25% faster**, and clean. Rather than ignoring _all_ of
`node_modules` (which also silences real findings), the config ignores only the 3
deps import-x genuinely can't parse — `react-native` (2,589 of the noise),
`react-native-view-shot`, `react-native-i18n`. So of the 1,991 warnings, **1,481**
are `import-x/no-deprecated` flags, **0** are parse-error noise, and the real
`import-x/no-named-as-default-member` (axios) flags are kept.

It is important to flag the decrease in warnings shown. This probably indicates a lot of type level deprecations are missing.

### Functional verification (same `.ts/.tsx` sample, both rules)

| Behaviour                                                                    | `@typescript-eslint/no-deprecated` | `import-x/no-deprecated`                     |
| ---------------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------- |
| BN.js number deprecations (`fromWei`, `isBN`, `renderFromWei`, `toGwei`, …)  | ✅                                 | ✅ (flags import line **and** each usage)    |
| Runs on `.js` files                                                          | ❌ (only in `*.{ts,tsx}` override) | ✅ (registered at root)                      |
| `@deprecated` from typed packages / `.d.ts` (3rd-party, design-system, etc.) | ✅                                 | ❌ (only flags JSDoc it can resolve & parse) |
| Needs `parserOptions.project` (the expensive bit)                            | ✅                                 | ❌                                           |

> **Validated:** import-x catches deprecated type aliases/interfaces from parseable source, but only checks _imported specifiers_ — so it misses deprecations reachable only via type inference (e.g. a `@deprecated` method/property on a typed value, `obj.oldMethod()`) plus anything declared in `.d.ts`/typed packages.

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
| baseline (type-aware)          | 304.97s     | 6,049          | —                       |
| drop `project` (no type-aware) | **173.38s** | 511            | **~43% faster (1.76x)** |

**Result: ✅ ~43% faster** — and this is the floor (~173s). It's the irreducible
non-type-aware cost (import resolution, react, `import-x/order`, jsdoc, tailwind
across ~12K files). You can't go lower cold without cutting more rules.

**⚠️ Danger:** this disables **all** type-aware rules, not just `no-deprecated`.
Files that genuinely need them (the perps `*-method-action-types*.ts`
Core-alignment files) must be re-scoped to a minimal tsconfig to keep working.

---

## Experiment 4 — Hybrid: ESLint (non-type-aware) + oxlint (type-aware)

**Hypothesis:** keep ESLint for everything non-type-aware (the ~173s floor from
Exp 3) and move the type-aware work to [oxlint](https://oxc.rs)'s new type-aware
mode (Rust + `tsgolint`/`typescript-go`). If oxlint is as fast as advertised, the
two together should beat the baseline **and** restore full `no-deprecated`
coverage. Also a first probe at a full oxlint migration.

> oxlint type-aware is **alpha** (Dec 2025). It implements 59/61 typescript-eslint
> type-aware rules incl. `no-deprecated`, via `tsgolint` (Microsoft's
> `typescript-go`, i.e. TS 7.0 "Corsa"). Needs `oxlint` + `oxlint-tsgolint`.

**Run** (ESLint side = Exp 3 config; oxlint side = [`.oxlintrc.json`](./.oxlintrc.json)):

```bash
# A) ESLint — all non-type-aware rules (same as Experiment 3)
NODE_OPTIONS='--max-old-space-size=12288' \
  /usr/bin/time -p yarn eslint '**/*.{js,ts,tsx}' \
  --no-eslintrc -c .eslintrc.no-type-aware.js --no-cache

# B) oxlint — ONLY the type-aware rule(s) ESLint dropped (no-deprecated).
#    tsgolint rejects the real tsconfig.json (baseUrl / node resolution /
#    non-relative paths all removed in TS7), so swap in a compatible one first.
cp tsconfig.json tsconfig.json.bak && cp tsconfig.oxlint.json tsconfig.json
NODE_OPTIONS='--max-old-space-size=12288' \
  /usr/bin/time -p yarn oxlint --type-aware -c .oxlintrc.json app tests scripts
mv tsconfig.json.bak tsconfig.json   # always restore
```

### Timing

| Run                                 | Time       | Warnings shown | vs baseline             |
| ----------------------------------- | ---------- | -------------- | ----------------------- |
| baseline (type-aware)               | 304.97s    | 6,049          | —                       |
| ESLint — non-type-aware (Exp 3)     | 165.51s    | 511            |                         |
| oxlint — type-aware `no-deprecated` | **12.66s** | 5,954          |                         |
| **hybrid total (sequential)**       | **~178s**  | 6,465          | **~42% faster (1.71x)** |
| **hybrid total (parallel)**         | **~166s**  | 6,465          | **~46% faster (1.84x)** |

**Result: ✅ ~42–46% faster _with full coverage restored._** oxlint's type-aware
`no-deprecated` adds only **~13s** (50x faster user-time is parallelised across
cores). Run the two linters in parallel and the hybrid wall-clock collapses to
the ESLint floor (~166s) — i.e. you get type-aware deprecation surfacing back for
essentially free.

### Functional verification

Unlike `import-x/no-deprecated` (Exp 2), oxlint's `typescript/no-deprecated` is
**true type-aware** — on the same sample it flags the BN.js deprecations
(`fromWei`, `isBN`, `toGwei`, `renderFromWei`) **and** the typed-library ones
(`Card`/`Text`/`Avatar` from design-system) that import-x can't see. The 6,465
total (vs 6,049 baseline) is _more_ coverage, not a regression: it also catches
deprecations in `tests/` (e.g. `checkIfDisabled`) that the current rule scope misses.

### Caveats (and the migration cost they imply)

1. **tsconfig must be TS7-compatible.** `tsgolint` rejected the real
   `tsconfig.json`: `baseUrl` removed, `moduleResolution: node` removed, `paths`
   values must be relative (`./…`). The experiment uses a swapped-in
   [`tsconfig.oxlint.json`](./tsconfig.oxlint.json). A real adoption means
   migrating the tsconfig (the biggest piece of work here).
2. **Alpha tooling.** Type-aware oxlint is alpha; large repos can hit `tsgolint`
   memory pressure. Pin versions.
3. **Minor TS7-strictness noise.** 8 stray diagnostics surfaced (7 in one ambient
   `.d.ts`, 1 from the nested `scripts/tooling/tsconfig.json`) — exclude/fix those
   in a real setup.
4. **No oxlint cache for type-aware** — but at ~13s cold it barely matters.

---

## Options compared (cold, full repo)

| #   | Option                                                                                                                    | Cold lint           | Warnings shown | Δ vs 305s baseline | Notes                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | **Base** — `main` today (type-aware `no-deprecated`)                                                                      | 305s                | 6,049          | —                  | needs `project`                                                                                                         |
| 2   | **`--quiet`**                                                                                                             | 302s                | 0              | ~1%                | no real win on ESLint v8 (output-only filter)                                                                           |
| 3   | **Swap to `import-x/no-deprecated`** (keep `project`)                                                                     | 229s                | 1,991          | ~25%               | low-risk; keeps all other type-aware rules; targeted `import-x/ignore` (3 deps); loses type-level/package `@deprecated` |
| 4   | **My branch — remove `no-deprecated` + bash burndown** ([#32262](https://github.com/MetaMask/metamask-mobile/pull/32262)) | 212s                | 511            | ~30%               | keeps `project`; replaces rule with `bn-migration-burndown.sh`; no eslint deprecation surfacing                         |
| 5   | **(⚠️ danger) Full type-aware removal** (drop `project`)                                                                  | 173s                | 511            | ~43%               | biggest cold win; disables ALL type-aware rules                                                                         |
| 6   | **Hybrid — ESLint (non-type-aware) + oxlint (type-aware `no-deprecated`)**                                                | ~178s seq / ~166s ∥ | 6,465          | ~42–46%            | full type-aware coverage restored; oxlint adds only ~13s; needs `oxlint`+`oxlint-tsgolint` + TS7 tsconfig (alpha)       |
