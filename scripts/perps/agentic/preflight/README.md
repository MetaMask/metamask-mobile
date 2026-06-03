# preflight

Stands up a clean, ready-to-code MetaMask Mobile runtime for one worktree:
dependencies reconciled, the native app built and installed on the
simulator/device, Metro + CDP up, and the wallet seeded from a fixture. Driven by
the `a:ios` / `a:android` (reuse) and `a:setup:ios` / `a:setup:android` (full
clean) package scripts.

## Why it exists

Several worktree "slots" run in parallel on one machine, often each driven by a
different coding agent. Compiling the native app is by far the slowest part of
bringing a slot up, so preflight keys every build by a content fingerprint and
stores the resulting `.app`/`.apk` in a machine-global cache. Slots on the same
commit + env reuse one build instead of compiling it N times — a fresh worktree
becomes a warm, reproducible environment in seconds instead of tens of minutes.
The more agents in flight, the larger the saving.

## Caches

| Scope | Location | Holds |
|---|---|---|
| Machine-global, shared by every slot | `<os-user-cache>/mm-mobile-builds/<plat>/<fp>.{app,apk}` — resolved automatically from the per-user OS cache directory; set `MM_BUILD_CACHE_DIR` to override | Built native artifacts, keyed by fingerprint |
| Per-worktree, gitignored | `<slot>/.agent/build-cache/` | `installed.json` (which fp is on which target) + pod and setup-artifact markers |

The fingerprint (`lib/compute-cache-fp.js`) excludes per-worktree build output and
live-served JS, so the same commit + env yields the same key in every slot — that
is what makes the global cache hit across slots. Markers stay local because each
clone has its own `node_modules`, pods, and generated artifacts. A per-fingerprint
lock lets slots build the same fingerprint concurrently without corrupting the
shared artifact.

## Modes

| Mode | Scripts | Behaviour |
|---|---|---|
| `auto` | `a:ios`, `a:android` | Reuse the installed app if it matches the fingerprint; else install from the global cache, or build once and store. |
| `clean` | `a:setup:ios`, `a:setup:android` | Full `yarn setup` + pods + native rebuild — for a fresh or corrupted worktree. |

`--mode fast` (never build, fail loud if missing) and `rebuild-native` are also
available for direct invocation.

## Modules

| File | Responsibility |
|------|----------------|
| `modules/types.ts` | Shared `Ctx` / `Flags` / result types |
| `modules/log.ts` | Colours, step timing, live-log tail, `runWithLiveLog` |
| `modules/env.ts` | `.js.env` load, arg parsing, mode resolution, `Ctx` assembly |
| `modules/proc.ts` | Process-tree kill, port sweep |
| `modules/cache.ts` | Fingerprint + global build cache (via the bridge below) |
| `modules/deps.ts` | JS-dep + setup-artifact staleness, reconcile, clean setup |
| `modules/ios.ts` | Simulator, build, install, cache store |
| `modules/android.ts` | Device, gradle build, apk install, cache store |
| `modules/runtime.ts` | Metro start, CDP wait, wallet setup |
| `preflight.ts` | Orchestrator |

## `lib/build-cache-cli.sh`

The global cache and per-fingerprint lock live in `lib/build-cache.sh` (hardened
flock/mkdir mutex, stale-lock detection, memo-dir ownership). `cache.ts` shells to
a thin subcommand bridge over it rather than re-implementing that logic in TS, so
there is one source of truth for the on-disk cache and locks across slots. The
cross-build lock is held by a `lock-hold` subprocess (see that file's header).
`lib/compute-cache-fp.js` stays plain `.js` so it runs under `node` without a TS
runtime.

## Run / typecheck

```bash
yarn a:ios          # auto: reuse, or build once and cache
yarn a:setup:ios    # clean: full rebuild for a fresh/corrupted worktree
yarn lint:tsc       # typechecks scripts/**/* including these modules
```
