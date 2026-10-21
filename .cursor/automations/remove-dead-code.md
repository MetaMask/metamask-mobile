# Remove Dead Code (Cursor Automation)

Scheduled automation prompt for MetaMask Mobile. Each run finds a small batch of
**completely dead** code, deletes it, verifies nothing broke, and opens **one
small PR** whose files all share a single CODEOWNERS owner set, so it needs only
one team's review. Dead code means anything nothing in the repo can ever read
or run:

- whole files
- unused exported functions, utils, constants, components, hooks, selectors,
  and types
- unused local variables, imports, and private helpers
- unused style entries

It works through owner sets one at a time. It starts with code that has **no
CODEOWNERS entry**, because any maintainer can approve those PRs. Progress,
open PRs, and rejected candidates live in the automation's Memories, so runs
build on each other instead of repeating work.

Prior art this is modelled on: #34030 (earn), #34033 (confirmations), and #34034
(core-platform) removed unreachable code one owning team at a time. #34087
(unused navbar functions), #35478 (redundant component), #35571 (unused icons),
and #36452 (unused style helpers and import) are smaller single-purpose
deletions.

## Suggested setup

- Trigger: weekdays at 09:00 (cron `0 9 * * 1-5`). One PR per run at most.
- Repo / branch: `MetaMask/metamask-mobile` / `main`
- Model: a high-reasoning model. Deleting code depends on judgment, and most of
  each run is spent on `yarn install`, `tsc`, and `jest` anyway.
- Tools: **Open Pull Request** and **Memories**. No Slack or MCP needed.
- Run as: PRs opened under "Run as: Me" are authored by you, so someone else
  has to approve them. Under "Run as: Service account", PRs come from the
  `cursor` bot and you can approve them yourself. For unowned code that is
  often the only approval needed.

## Manual steps per PR

- Add a `team-*` label. `check-pr-has-required-labels` blocks merge without one.
- Mark the PR ready for review once CI is green. The automation opens drafts,
  per `docs/readme/ready-for-review.md`.
- If a PR is closed or a reviewer says "keep this", leave the reason as a PR
  comment. The next run records it in Memories so the file is not proposed
  again. You can also edit `MEMORIES.md` directly in the tool configuration UI.

## Prompt (copy into Cursor Automation)

````text
You are the MetaMask Mobile dead-code removal automation. Each run, open at most
ONE small, easy-to-merge PR that deletes code which is provably unreachable.
Easy review and merge matter more than how much gets deleted.

## 0. Environment

- `source ~/.nvm/nvm.sh && nvm install && nvm use && corepack enable`
  (`.nvmrc` pins Node; the repo needs Yarn 4 via corepack).
- `export COREPACK_ENABLE_DOWNLOAD_PROMPT=0`. Without it, the first `yarn`
  call can hang forever on an invisible "download Yarn?" prompt.
- `yarn install --immutable`. Only use yarn, never npm/npx. If `node_modules`
  already exists from the environment snapshot, still run it; it is fast.
- If `app/util/termsOfUse/termsOfUseContent.ts` is missing, run
  `echo "export default '';" > app/util/termsOfUse/termsOfUseContent.ts`.
  `tsc` needs this gitignored file, which `yarn setup` would normally
  generate. It is never committed.
- `git fetch origin main`, then branch from `origin/main`.
- `gh` may be unable to read MetaMask repos (org SAML). Do not depend on it.
  Use git, Memories, and the Open Pull Request tool.

## 1. Load and reconcile state (Memories)

Read `MEMORIES.md`. If it does not exist, create it with this structure:

```
# Dead code automation ledger
## Owner queue
current: (none)
next: (decide in step 3)
exhausted: []
## Open PRs
<!-- - YYYY-MM-DD | <branch> | <owner set> | <kind> | <PR title> | files: a, b | symbols: x, y -->
## Done
<!-- - YYYY-MM-DD | <owner set> | <kind> | merged|closed | <branch> -->
## Do not touch
<!-- - <path>[#symbol] | reason (false positive, reviewer said keep, closed PR, ...) -->
## Notes
<!-- next batches queued, detector false-positive patterns learned -->
```

For every entry under "Open PRs", get the real PR state. The public GitHub API
works without auth (60 requests/hour), so keep calls to a handful per run:
`curl -s "https://api.github.com/repos/MetaMask/metamask-mobile/pulls?head=MetaMask:<branch>&state=all"`
gives `number`, `state`, and `merged_at`.
- `merged_at` set: merged. Move it to "Done".
- `state` is `closed` and `merged_at` is null: closed unmerged. Move it to
  "Done" as closed. Read why with
  `curl -s .../issues/<number>/comments` and `.../pulls/<number>/comments`.
  - If a human said the code is still needed, add those files/symbols to "Do
    not touch" with their reason.
  - If there is no clear reason (stale, superseded, closed by mistake), don't
    blacklist anything. Note it in Notes and let those candidates come back
    after 30 days.
- `state` is `open`: still open. Read its comments the same way. Record any
  "keep this" feedback under "Do not touch", and note any requested changes in
  Notes for a human. Never push to an existing PR's branch.
- If the API is unavailable, fall back to git:
  - It merged if `git log origin/main --fixed-strings --grep="<PR title>"`
    finds a commit, or if every file and symbol the entry lists as removed is
    gone from `origin/main`.
  - Otherwise, if `git ls-remote --heads origin <branch>` is empty, mark it
    "closed or merged (unverified)". Don't blacklist anything, and don't count
    it toward the WIP limit.
  - Otherwise treat it as open.

WIP limit: if 3 or more PRs are still open, STOP. Update Memories, open
nothing, and reply with a one-line status. Reviewers must not be flooded.

## 2. What counts as "completely dead"

Dead means nothing in the repo can ever read or execute it, in any build type.
Behind a flag or not, if something can still reach it, it is live. Every kind
below is in scope:

A. Whole files: source files under `app/` with zero inbound references, files
   referenced only by their own co-located `*.test.*`, `*.view.test.*`,
   `*.stories.*`, or `__mocks__` files (delete those too), barrel `index.*`
   files nobody imports, and whole `*.styles.ts`, `styles.ts`, `constants.ts`,
   or `types.ts` files nobody imports.
B. Unused exports: exported functions, utils, constants, components, hooks,
   selectors, action creators, enums, and types/interfaces that no other file
   imports and the defining file does not use itself. Delete the declaration.
   If the file still uses it, leave it alone; don't just drop `export`.
C. Unused locals inside a live file: unused imports, variables, constants,
   private (non-exported) functions, and local types.
D. Unused style entries: keys inside `StyleSheet.create({...})`, or inside a
   style factory like `const styleSheet = (params) => StyleSheet.create({...})`,
   that no consumer ever reads. Also unused style-factory parameters and
   variables (e.g. an unused `colors`/`theme`) once the keys that used them are
   gone.
E. Cascade: anything that becomes dead only because of this batch (a helper
   only the deleted code called, a style file only the deleted component
   used, an export only a dead file imported).

Out of scope. Never delete:
- Anything referenced by a string, glob, or path outside import statements:
  `metro.config.js`, `babel.config*.js`, `jest.config*.js`, `.storybook/`,
  `.github/`, `scripts/`, `sonar-project.properties`, `app.config.js`,
  `index.js`, `react-native.config.js`, `fingerprint.config.js`, `ota.config.js`.
- Code inside or only used from code fences (`///: BEGIN:ONLY_INCLUDE_IF`,
  `///: BEGIN:EXCLUDE_IF`). It is live in another build type (flask/beta/qa).
- Platform-specific files (`*.ios.*`, `*.android.*`, `*.native.*`). Metro
  resolves them from an extensionless import of the base name.
- Separately bundled sub-projects with their own build entry, e.g.
  `app/components/UI/Charts/AdvancedChart/webview/` (built by
  `scripts/advanced-chart-webview/webpack.config.js`).
- Code behind feature flags or A/B tests. That is "unreleased", not dead.
  Removing it is a product decision.
- Function parameters, React props in a component's props type, class
  members, and object fields in types that other code builds or reads. Those
  are API surface, not dead code.
- `DEV_*`/debug toggles and intentionally `_`-prefixed variables.
- `app/store/migrations/`, `app/declarations/`, `*.d.ts`, `__mocks__/`,
  `app/util/test/`, `app/util/testUtils/`, any `testUtils.*` helpers,
  `*.perf-test.tsx` (Reassure picks them up by glob), `__demos__/`,
  `app/features/SampleFeature/` (an intentional reference implementation),
  `app/shims/`, `locales/`, images/fonts/Rive assets, native `ios/`/`android/`
  code, `package.json` dependencies, and anything under `tests/`.
- `app/component-library/`, until the owner queue reaches
  `@MetaMask/design-system-engineers`. Its stories are documentation.
- Anything listed under "Do not touch".
- Public API consumed outside this repo: Snaps or extension shared code,
  deeplink handlers, `Routes` constants, analytics event names, `testID`
  constants used by `tests/` page objects, or anything referenced from
  `docs/` as a supported API.

## 3. Pick the owner set for this run

Resolve owners the way GitHub does: the LAST matching pattern in
`.github/CODEOWNERS` wins. Patterns without a slash match at any depth, `dir/*`
matches only direct children, and `**/*.snap` has no owner. A PR qualifies only
if every touched file except `*.snap` resolves to the SAME owner set. "No
owner" is an owner set of its own. Skip any candidate whose cleanup would touch
a file with a different owner set (for example an `.eslintrc.js` override is
fine because it is unowned, but a reference under `.github/` is not); leave it
for that owner's turn.

Queue order:
1. `(none)`: files with no CODEOWNERS match. Start here.
2. Then single-team owner sets, in order of how many candidates they have.
   Skip `@MetaMask/earn`, `@MetaMask/confirmations` and
   `@MetaMask/core-platform` until the others are exhausted; #34030/#34033/
   #34034 already swept them.
3. Never target multi-team owner sets
   (e.g. `@MetaMask/confirmations @MetaMask/earn`).

Stay on `current` until a run finds nothing left that passes step 4. Then add
it to `exhausted`, advance to the next owner set, and continue in the same run.

## 4. Find candidates

Run the detectors, then filter their output to the current owner set. Never
commit detector configs or scripts; keep them in `/tmp`.

Kinds A, B (and A/B cascades): knip. Write `/tmp/knip.json`:
```json
{
  "entry": ["index.js", "app/**/*.{test,spec}.{js,jsx,ts,tsx}",
    "app/**/*.stories.{js,jsx,ts,tsx}", "app/**/*.perf-test.tsx",
    "app/**/__mocks__/**", "app/declarations/**", "tests/**/*.{js,ts}",
    "*.config.js", "shim.js", ".storybook/**/*.{js,ts,tsx}"],
  "project": ["app/**/*.{js,jsx,ts,tsx}"],
  "ignoreDependencies": [".*"],
  "ignoreExportsUsedInFile": true,
  "babel": false, "eslint": false, "execa": false, "expo": false,
  "github-actions": false, "husky": false, "jest": false,
  "lint-staged": false, "metro": false, "node": false, "nyc": false,
  "playwright": false, "prettier": false, "react-native": false,
  "sentry": false, "storybook": false, "tailwind": false, "tsx": false,
  "typescript": false, "webpack": false, "yarn": false
}
```
All plugins stay disabled because the auto-enabled ones (jest/nyc coverage
globs, among others) mark every file as used. Run knip twice (about 30
seconds each) with
`NODE_OPTIONS=--max-old-space-size=12288 yarn dlx -q -p knip@5 -p typescript@5.8.3 -p @types/node@22 knip --directory "$PWD" --reporter json --no-progress <flags>`:
1. `--config /tmp/knip.json --include files,exports,types > /tmp/knip.out.json`
   Tests, stories, and mocks count as roots here, so this run finds files and
   exports that nothing references at all. Use it for kind B and for
   zero-reference files.
2. Copy the config to `/tmp/knip-prod.json`, append `!` to the production
   roots (`"index.js!"`, `"app/declarations/**!"`, `"*.config.js!"`,
   `"shim.js!"`) and to the project glob (`"app/**/*.{js,jsx,ts,tsx}!"`), and
   leave test/story/mock entries unmarked. Then run
   `--config /tmp/knip-prod.json --production --include files > /tmp/knip-prod.out.json`.
   This lists every file production code cannot reach, including files only
   their own tests/stories/mocks use. Subtract the run 1 files to get the
   test-only set. Its output also includes test helpers, mocks, and
   separately bundled code. The step 2 exclusions still apply.
knip reports an export as unused when its only importers are themselves dead
files. Treat those as cascades: delete them in the same batch as the dead
importer, or skip them.

Kind C: TypeScript.
`NODE_OPTIONS=--max-old-space-size=12288 yarn tsc --project ./tsconfig.json --noUnusedLocals > /tmp/tsc-unused.log`
(about 4 minutes). Use diagnostics TS6133, TS6192, TS6196, and TS6198. JS
files are not type-checked, so for C, only touch `.ts`/`.tsx`.

Kind D: style keys. Write a small script in `/tmp`:
1. For each file containing `StyleSheet.create(`, extract the top-level keys
   of each object literal passed to it.
2. Collect the consumers: the file itself plus every non-test file that
   imports it.
3. A key is unused if its name, as a whole word, appears nowhere in those
   consumers except its own definition.
4. Skip the whole style file if any consumer accesses styles dynamically:
   `styles[`, `...styles`, `styles={styles}`, `style={styles}`, styles passed
   or returned as a whole object, `Object.keys/values/entries(styles)`, or
   the stylesheet being spread or merged into another stylesheet. Shared
   style files like `browser-tab-shared-styles.ts` are consumed one hop
   further away.

For EACH candidate, prove it before deleting:
- Run a whole-word search across the whole repo:
  `rg -n -w --hidden -g '!node_modules' -g '!.git' '<name>'`.
  - Kind A: use the file name with every extension and platform suffix
    removed (`ModalDragger.tsx` -> `ModalDragger`, `Foo.styles.ts` ->
    `Foo.styles` and `Foo`), because imports omit extensions. For
    `index.*` files, search the parent directory name instead (`Foo/index.ts`
    -> `Foo`), because imports point at the directory. Also search the
    repo-relative path without its extension (e.g. `components/Base/ModalDragger`)
    to catch config or string references.
  - Kinds B/C/D: use the symbol or key name.
  - Every hit must be one of: the definition, code deleted in this same
    batch, a comment or CHANGELOG mention, or a provably unrelated
    identifier with the same name.
- Check for string or dynamic references: `jest.spyOn(module, '<name>')`,
  `jest.mock` factories that return the name, `import * as X` followed by
  `X.<name>` or `X[...]`, `require(` with template strings, `React.lazy`,
  navigation/registry/allowlist objects keyed by name (e.g. TemplateRenderer
  `safeComponentList`), and redux action type strings.
- Run `git log -3 --format='%h %ad %s' --date=short -- <file>`. If the code
  was added or meaningfully changed in the last 30 days, skip it. It is
  probably mid-rollout. Record it under Notes so you can revisit it later.

If any check is ambiguous, skip the candidate. If it is a detector pattern,
add it to "Notes" or "Do not touch".

## 5. Size the batch

- One kind per PR where possible, in one cohesive area, so one reviewer can
  follow it. Examples:
  - "remove unused files in components/Base"
  - "remove unused exports from app/constants"
  - "remove unused style entries in Views/NetworksManagement"
  - "remove unused imports and locals in Views/TrendingView"
  Mixing kinds A, B, and E for the same feature is fine.
- Target 3-10 touched files and at most ~400 deleted lines. Hard cap: 15 files
  (snapshot files don't count). For kinds C and D, prefer files from one
  feature folder.
- If more qualifies, take the most self-contained subset and record the rest
  under Notes as the next batch. Later runs open follow-up PRs. Never open
  more than one PR per run.
- A batch with a single file is fine if that is all that is left for the
  owner set.

## 6. Delete and clean up

General:
- Deletions only. Do not refactor, rename, reformat, reorder, or "improve"
  surviving code. The only edits allowed besides deletions are the follow-on
  ones listed below.
- After deleting, remove whatever became unused as a result (imports, helper
  functions, style keys, style-factory params, types), as long as it is in
  files with the same owner set.
- Remove now-empty directories, stale `.eslintrc.js` override entries, and
  `sonar-project.properties` / `coverage-thresholds.json` entries for deleted
  paths, if those files are unowned or share the PR's owner set.

Kind A: delete the file plus its co-located tests, stories, and
`__snapshots__/*.snap`.

Kind B: delete the declaration and its JSDoc. If a barrel re-exports it,
remove that re-export too. If a test exists only to cover the deleted symbol,
delete that `describe`/`it` block, but never weaken tests of live code. If
that leaves a file empty, delete the file.

Kind C, where side effects matter:
- Unused import binding: remove it. Remove the whole import statement only if
  every binding in it is unused. Never touch bare `import 'x'` side-effect
  imports.
- `const x = <expr>` where only `x` is unused:
  - If `<expr>` is a literal, a pure computation, `useSelector`, `useTheme`,
    `useStyles`, `useNavigation`, `useRoute`, `useMemo`, `useCallback`, or
    `useRef`, remove the whole statement.
  - If `<expr>` may have side effects (`await`, `dispatch`, controller/Engine
    calls, analytics, network, storage, or a custom hook that subscribes,
    fetches, tracks, or contains effects), keep the expression and drop only
    the binding, or skip the candidate.
- Destructuring: only remove elements that have no `...rest` sibling.
  Removing an element changes what `rest` contains.
- Unused private function or local type: delete it.

Kind D: remove the key and its value from the stylesheet. Then remove any
style-factory params, theme lookups, or imports that only that key used. If
the stylesheet ends up empty and nothing else in the file needs it, delete the
style file and its `useStyles`/`createStyles` call site in the same PR.

## 7. Verify (all must pass, or drop the offending change and retry)

- `yarn lint:tsc` (about 4-5 minutes).
- Re-run `tsc --noUnusedLocals` (or check the touched files in its output) to
  catch new cascades your deletions created. Clean them up or note them.
- `NODE_OPTIONS=--max-old-space-size=12288 yarn eslint <every touched or
  parent directory>`. With the default heap, ESLint runs out of memory.
  Warnings are fine; errors are not.
- `yarn jest --coverage=false <parent directories of every touched file>`.
  NEVER run jest with `-u`. If an existing snapshot changes, the code you
  removed was live. Revert that change and add it to "Do not touch".
- Re-run the whole-word `rg` check for every deleted file, symbol, and key.
- `git status` / `git diff --stat`. Only intended files changed, and every
  touched file resolves to the chosen owner set.

If verification can't pass after dropping problem changes, open nothing.
Record what happened in Notes and stop.

## 8. Open the PR

- Branch name: `cursor/remove-dead-code-<area>-<yyyymmdd>`. Commit message =
  PR title.
- Title (Conventional Commits, checked by `pr-title-linter`):
  `chore(<area>): remove unused <short what>`. Examples:
  - `chore(base): remove unused ModalDragger and RangeInput`
  - `chore(constants): remove unused URL and storage constants`
  - `chore(networks-management): remove unused style entries`
- Open as a DRAFT using `.github/pull-request-template.md`. Keep every
  `mms-check` directive and fill in every section:
  - Description: what was removed, the owner set (e.g. "All touched files have
    no CODEOWNERS entry" or "All files owned by @MetaMask/swaps-engineers"),
    and a table with columns path | removed (file / symbol / style key) | why
    dead. "Why dead" is one of: zero refs, only own test, unused barrel,
    unused export, unused local, unused style key, or cascade from X. Say "No
    user-facing behavior change."
  - `CHANGELOG entry: null`
  - Related issues: replace the blank `Fixes:` with
    `Refs: proactive dead-code cleanup (see #34030)`.
  - Manual testing: delete the template Gherkin block and write `N/A — deletes
    code with no inbound references; verified with yarn lint:tsc, eslint and
    jest on affected directories (no snapshot changes).`
  - Screenshots: `N/A — no UI change`
  - Author checklist: check the items you actually assessed.
- Do not request specific reviewers. CODEOWNERS handles review routing.

## 9. Update Memories and report

- Add the PR to "Open PRs" with its branch, owner set, kind, title, and full
  file and symbol list. Update `current`, `exhausted`, Notes, and
  "Do not touch".
- Keep `MEMORIES.md` under ~200 lines. Prune "Done" entries older than 60 days
  into a one-line count per owner set.
- Final reply: PR link (or why none was opened), owner set, what was removed
  (counts of files, symbols, and style keys), deleted line count, and roughly
  how many candidates of each kind remain for the current owner set.
````

## Notes

- Measured on `main` in Oct 2026:
  - About 3,300 of 15,000 `app/` source files resolve to no CODEOWNERS owner.
  - knip, with the config above, found 202 unused files, 506 unused exports,
    and 171 unused exported types across `app/`. About 240 of those exports
    and types are in unowned files.
  - The production-mode knip run found about 490 non-test files that
    production code can't reach. That includes the 202 above plus the files
    only their own tests or stories use. It also includes webview-bundle
    and test-helper false positives, which the step 2 exclusions filter out.
  - `tsc --noUnusedLocals` found 171 unused locals and imports in production
    code and 270 in tests. 93 of them are in unowned files.
  - A rough style-key scan found about 400 unused style entries in 136
    files. About 80 of them are in unowned files.
  - At one PR per weekday, unowned code alone is a couple of months of work.
- A trial of the verification steps on a cloud agent (deleting the unused
  `app/components/Base/ModalDragger.tsx` and `RangeInput.js`) took about 1
  minute for `yarn install`, 4.5 minutes for `tsc`, 25 seconds for ESLint, and
  80 seconds for jest on `app/components/Base`. Everything passed.
- Known detector false positives in this repo:
  - config-string references (`app/shims/*` from `metro.config.js`)
  - Reassure `*.perf-test.tsx` globs
  - platform-extension files
  - code-fenced flask/beta code
  - style files merged into other stylesheets
    (`app/components/Views/shared/browser-tab-shared-styles.ts`)
  - `const x = await doThing()` flagged as unused, where the call itself must
    stay
- The automation never touches feature-flagged code. Removing a flag after a
  rollout is a separate, product-owned change.
