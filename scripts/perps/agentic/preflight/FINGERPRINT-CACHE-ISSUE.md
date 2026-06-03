# Cross-worktree build-cache fingerprint divergence

Status: **partially solved** (one cause fixed, one open). This is a handoff doc for
anyone continuing the work. It is precise about what was measured, what was tried,
and what is still open.

## Goal

The preflight build cache (`lib/build-cache.sh` + `lib/compute-cache-fp.js`) keys
each built `.app`/`.apk` by a **content fingerprint of native-affecting inputs**
and stores it in a machine-global cache (`~/Library/Caches/mm-mobile-builds/...`).
The intent: **commit/branch is irrelevant** — two worktrees ("slots") with no
native change must compute the **same fingerprint** and reuse one build instead of
each compiling for ~20 min.

The observed reality: worktrees on the **same commit** compute **different**
fingerprints, so the global cache almost never hits across worktrees.

## How the cache works

- `lib/compute-cache-fp.js` calls `@expo/fingerprint` `createFingerprintAsync`,
  spreading the repo's `fingerprint.config.js` (`extraSources`, `ignorePaths`) and
  adding agentic-only `ignorePaths` for per-worktree dev/build output.
- The resulting hash is the cache key. `bash a:ios` looks up `bc_has_artifact ios <fp>`
  and installs it if present; otherwise it builds and stores under the fp.
- A **drift report** is built in: `node lib/compute-cache-fp.js --json` writes the
  full source list; `--diff <prev.json>` prints exactly which inputs changed. On a
  cache miss the orchestrator prints this (`reportDrift`). **Use it** — it is how
  every finding below was located.

## Why fingerprints diverge — measured findings

Diffing two worktrees on the same commit (`5394a80`) repeatedly narrowed the
causes. There are three, with very different status:

### 1. `package.json` scripts — FIXED ✅

`@expo/fingerprint` hashes `package.json` scripts. Editing an unrelated script
(e.g. the agentic `a:*` entries — which is exactly what this branch did) shifted
the fingerprint, even though scripts cannot affect the native binary.

Fix applied in `lib/compute-cache-fp.js`:

```js
sourceSkips: fp.SourceSkips.PackageJsonScriptsAll,   // = 1024
```

Validated: with the skip, the same worktree on `main` vs `5394a80` (which differ
**only** in `a:*` scripts) produces the **identical** fingerprint
`6858435dc8fafab7203afeaa1ef7e30296248cbb`. Before the skip they differed.

### 2. `pod install` / Android codegen mutate `node_modules` in place — OPEN ⚠️

The genuine bug. Running `pod install` (iOS) **edits node_modules podspecs in
place** — e.g. `node_modules/react-native-aes-crypto/react-native-aes.podspec`
gains `s.dependency "RCTDeprecation"`. Android codegen likewise rewrites
`node_modules/**/android/src/main/AndroidManifest.xml`. `@expo/fingerprint` hashes
these via React-Native core autolinking (`rncoreAutolinkingIos/Android`).

Critical properties (all measured):
- The mutation **persists across `yarn install`** — verified: mutate the podspec,
  run `yarn install`, hash is unchanged (Yarn Berry trusts its install state and
  does not re-extract a modified package).
- So a worktree's fingerprint **shifts the first time it runs a native build** and
  then diverges from any worktree in a different build state. Drift between a
  pod-installed worktree and a fresh one shows exactly:
  `changed node_modules/react-native-aes-crypto [rncoreAutolinkingAndroid,rncoreAutolinkingIos]`.
- There is **no `SourceSkips` flag** for autolinking. `ignorePaths` on
  `node_modules/**/build/**` had **no effect** (autolinking hashes a computed
  value, not those file paths).

Consequence: cross-worktree sharing works between worktrees that have **never run
a native build** (pristine `node_modules`), and breaks once any worktree builds.

### 3. Env-populated native files — by design, not a bug ℹ️

After fixing #1 and excluding pod-mutated packages, two pristine worktrees still
diverged on `ios` + `android` (`bareNativeDir`). The differing files were:
- `ios/debug.xcconfig`, `ios/release.xcconfig` — generated from env; one worktree
  had `MM_BRANCH_KEY_LIVE/TEST`, `MM_FOX_CODE`, the other did not.
- `android/app/google-services.json` — present in one worktree, absent in the other.

These bake into the binary, so they are **intentionally hashed**
(`compute-cache-fp.js` header documents this). Divergence here is **correct**:
different env ⇒ different build ⇒ different fingerprint. For real cross-slot
sharing, slots must share the same build env (Infura/Branch/Firebase/feature
flags); only port/sim may differ (those are not hashed — verified).

## What was tried (and the outcome)

| Attempt | Outcome |
|---|---|
| `ignorePaths: node_modules/**/build`, `android/build`, `.cxx` | **No effect** — autolinking doesn't hash those paths. Reverted. |
| Store under the pre-build (lookup) fp instead of recomputing post-build | **Wrong** — breaks *within*-worktree caching: after a build mutates node_modules, the same worktree's next lookup fp shifts, so it never matches its own stored key → rebuilds every run. Reverted. |
| `yarn install` to restore pristine node_modules | **Does not restore** in-place mutations (measured). |
| `sourceSkips: PackageJsonScriptsAll` | **Works** (finding #1). Applied. |

Note on the lookup-vs-store fp: the original bash preflight stored under **both**
the post-build fp **and** a pre-build "source-fingerprint alias" (so fresh slots
could hit the source key). The TS port deferred that alias. Re-adding it is
necessary-but-not-sufficient: the source fp itself is non-deterministic once
node_modules is pod-mutated (finding #2), so the alias only helps truly-pristine
slots.

## Current state

Uncommitted on top of the committed TS port (`5394a80`):
- `lib/compute-cache-fp.js` — `sourceSkips: PackageJsonScriptsAll` added.
- `preflight/README.md` — fingerprint section documenting the principle + gaps.
- `ios.ts` / `android.ts` — reverted to committed (the broken store-fp change removed).

The cache *mechanism* (key → artifact → lock → install) is sound and unchanged
from the bash preflight; this is purely a fingerprint-purity problem.

## Open questions for the next agent

1. **Make autolinking deterministic (finding #2).** Options to evaluate:
   - Compute the fingerprint over a **canonical/pristine** `node_modules` — e.g.
     restore the affected podspecs/manifests before hashing, or hash the package's
     *published* native config rather than the installed (mutated) copy.
   - Exclude the RN core autolinking source and rely on `yarn.lock` (versions are
     already hashed) — find whether `@expo/fingerprint` allows skipping/limiting
     the autolinking source (no `SourceSkips` for it; maybe a react-native config
     or a custom source override).
   - Normalise the mutation: the added `RCTDeprecation` dep / manifest edits are
     deterministic from the RN version (already hashed), so the mutated content is
     redundant — is there a clean way to canonicalise it before hashing?
2. **Re-add the source-fingerprint alias** in `ios.ts`/`android.ts` (store under
   both pre- and post-build fp) so pristine slots can hit a building slot's
   artifact — only useful once #2 makes the pre-build fp deterministic.
3. **Confirm the end-to-end win**: two pristine worktrees, same env, fresh
   `yarn install`, same commit → same fingerprint → real cache hit (no build).

## Reproduction

```bash
# Drift between two worktrees on the same commit (the core tool):
CF=scripts/perps/agentic/lib/compute-cache-fp.js
git -C <wtA> checkout <commit>; (cd <wtA> && node $CF --json) > /tmp/a.json
git -C <wtB> checkout <commit>; (cd <wtB> && node $CF --diff /tmp/a.json) | jq '.[].key'

# Prove pod-mutation persists across yarn install:
P=node_modules/react-native-aes-crypto/react-native-aes.podspec
shasum "$P"; printf '\n# x\n' >> "$P"; yarn install; shasum "$P"   # hash unchanged
```
