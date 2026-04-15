---
name: perps-core-sync
description: Sync the perps controller from mobile to the core monorepo with change detection, automated validation, failure resolution, and post-sync commit guidance. Use after perps controller changes land in mobile.
---

# Perps Core Sync

## Purpose

Use this skill to sync `app/controllers/perps/` from mobile to `packages/perps-controller/src/` in the core monorepo. The sync is driven by `scripts/perps/validate-core-sync.sh` — a 13-step pipeline that validates not only source sync but also the built publish artifact safety for extension consumers.

Use when:

- New commits touch `app/controllers/perps/` since the last sync
- A perps PR is merged and needs to propagate to core
- You need to verify mobile changes are core-compatible before pushing

Do not use when:

- Changes are UI-only (`app/components/UI/Perps/`) — these don't sync
- Changes are test-only (`*.test.ts`) — tests are excluded from sync
- The core repo is not checked out locally

## Pre-Sync: Detect Changes

Read the sync state from core to find what changed since the last sync:

```bash
cat <core-path>/packages/perps-controller/.sync-state.json
```

Extract `lastSyncedMobileCommit` and run:

```bash
# Commits since last sync
git log <lastSyncedMobileCommit>..HEAD --oneline -- app/controllers/perps/

# File-level summary (excluding tests)
git diff <lastSyncedMobileCommit>..HEAD --stat -- app/controllers/perps/ ':!*.test.ts'
```

Pay special attention to:

- **New files** — need exports wired in core's `index.ts`, may need `tsconfig` references or new dependencies
- **Deleted files** — rsync `--delete` handles removal, but verify no stale imports remain in core
- **Changes to `PerpsPlatformDependencies`** — DI interface changes affect extension consumers
- **Public API changes** — state shape, method signatures, event names affect all consumers

## Execute Sync

```bash
bash scripts/perps/validate-core-sync.sh --core-path <core-path>
```

Options:

- `--skip-build` — skip the build step for faster iteration when debugging lint/copy issues
- `--skip-test` — skip the test step for faster iteration
- `--verbose` — show full output for every step (useful for debugging)

The script runs these 13 steps in order:

| Step                       | What it does                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| 1. Pre-flight checks       | Confirms mobile source, core destination, required tools                                         |
| 2. Conflict check          | Fetches origin/main, checks for upstream perps-controller changes, validates sync state          |
| 3. Copy source files       | rsync `.ts` files (excluding tests, mocks, fixtures)                                             |
| 4. Install dependencies    | `yarn install` in core                                                                           |
| 5. Verify build fixes      | Checks for `__DEV__`, mobile imports, closure fixes                                              |
| 6. ESLint auto-fix         | Runs `--fix`, `--suppress-all`, `--prune-suppressions`, checks suppression delta                 |
| 7. Format fix (oxfmt)      | Runs `yarn lint:misc --write` — core uses oxfmt, not prettier                                    |
| 8. Build                   | `yarn workspace @metamask/perps-controller build`                                                |
| 9. Verify publish artifact | Confirms built `dist/PerpsController.{mjs,cjs}` still preserves the MYX webpack-ignore safeguard |
| 10. Lint                   | Final lint pass to confirm zero violations                                                       |
| 11. Test                   | `yarn workspace @metamask/perps-controller test` — catches DI/fixture mismatches                 |
| 12. Changelog check        | Verifies `CHANGELOG.md` has been updated (core CI requirement)                                   |
| 13. Write sync state       | Updates `.sync-state.json` with commit hashes and checksum                                       |

## Failure Resolution

| Failure                                                  | Cause                                                          | Fix                                                                                                                                                                     |
| -------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `__DEV__` found                                          | Mobile code uses `__DEV__` guard                               | Replace with `false` in the mobile source file, or route through `PerpsPlatformDependencies` for environment-aware behavior. Fix in mobile, then re-sync.               |
| Mobile imports (Engine, react-native, Sentry, DevLogger) | Direct platform import in controller                           | Route through `PerpsPlatformDependencies` (DI). All platform services must come through the `infrastructure` constructor param. Fix in mobile.                          |
| Suppression delta increase                               | Sync introduces new ESLint violations                          | Fix violations in mobile first (e.g., `'x' in y` → `hasProperty(y, 'x')` from `@metamask/utils`). Re-run sync after fixing.                                             |
| Build failure                                            | Missing tsconfig references, missing dependencies, type errors | Check `packages/perps-controller/tsconfig.json` references. Ensure new imports have corresponding `dependencies` in `package.json`.                                     |
| Lint failure after fix                                   | Auto-fix didn't resolve all issues                             | Re-run the eslint fix step. If persistent, check for new rule violations that need manual fixes in mobile.                                                              |
| Format fix failure                                       | oxfmt can't auto-fix some files                                | Check for syntax errors that prevent parsing. Core uses `oxfmt` (not prettier) for TS formatting.                                                                       |
| Test failure                                             | Test fixtures missing new DI dependencies                      | Add mocks for new `PerpsPlatformDependencies` fields (e.g., `diskCache`) in `tests/defer-eligibility.test.ts`.                                                          |
| Publish artifact verification failure                    | Built Core dist lost the MYX webpack-ignore safeguard          | Restore the `myxModulePath` workaround in mobile `PerpsController.ts`, rebuild Core, and confirm `dist/PerpsController.{mjs,cjs}` still contains `webpackIgnore: true`. |
| Changelog check failure                                  | `CHANGELOG.md` not updated                                     | Add entries under `## [Unreleased]` with `### Added`, `### Fixed`, `### Changed` sections linking to the PR.                                                            |
| Conflict check: behind origin/main                       | Someone pushed perps-controller changes to main                | `cd <core-path> && git merge origin/main` before re-running sync.                                                                                                       |
| Conflict check: checksum mismatch                        | Core source was hand-edited since last sync                    | Review the edits. Either port them back to mobile or discard and re-sync.                                                                                               |

## Post-Sync

After all 12 steps pass:

1. **Review the diff in core:**

   ```bash
   cd <core-path> && git diff --stat
   ```

2. **Update `CHANGELOG.md`** before committing. Core CI requires entries under `## [Unreleased]`. Sections must follow [Keep a Changelog](https://keepachangelog.com/) order:

   ```
   ### Added      — new features, exports, files
   ### Changed    — refactors, dependency bumps
   ### Deprecated — soon-to-be-removed features
   ### Removed    — removed features
   ### Fixed      — bug fixes
   ### Security   — vulnerability fixes
   ```

   Each entry must link to the PR: `([#NNNN](https://github.com/MetaMask/core/pull/NNNN))`.
   Validate locally: `yarn workspace @metamask/perps-controller changelog:validate`

3. **Commit in core** with conventional format:

   ```
   feat(perps): sync controller from mobile

   Syncs app/controllers/perps/ from mobile commit <short-hash>.

   Changes:
   - <summarize key changes from the pre-sync commit list>
   ```

4. **Verify `.sync-state.json` was updated** — it should contain the current mobile HEAD commit.

5. **Check suppression count** — if non-zero, note it in the PR description. Target is zero suppressions.

6. **Use `--verbose` when debugging** — without it, step output is captured to temp files and only shown on failure. With `--verbose`, all output streams to the terminal.

7. **Treat extension-consumer safety as a hard invariant.** If `packages/perps-controller/package.json` excludes `dist/providers/MYXProvider*`, the built `dist/PerpsController.{mjs,cjs}` must still preserve the `webpackIgnore` safeguard so extension bundlers never statically resolve the missing file.

## Portability Rules

Reference: `docs/perps/perps-review-antipatterns.md` (Controller Portability section).

- **No `__DEV__`** — must not appear in controller files. Core has no React Native dev mode.
- **No mobile imports** — no `react-native`, `Engine`, `Sentry`, `DevLogger`. Everything through `PerpsPlatformDependencies` DI.
- **No direct controller imports from app code** — app files must import from `@metamask/perps-controller`, not relative paths.
- **Public API = publisher contract** — changing state shape, method signatures, or event names affects extension consumers. Coordinate breaking changes.
- **New dependencies must be in DI interface** — controller code must not reach outside its boundary.
