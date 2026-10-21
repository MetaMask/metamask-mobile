# Remove Dead Code (Cursor Automation)

Scheduled automation prompt for MetaMask Mobile. Each run finds a small batch of
**completely dead** code (files or exports that nothing in the repo reaches),
deletes it, verifies nothing broke, and opens **one small PR** whose files all
share a single CODEOWNERS owner set, so it needs only one team's review.

It works through owner sets one at a time. It starts with code that has **no
CODEOWNERS entry**, because any maintainer can approve those PRs. Progress,
open PRs, and rejected candidates live in the automation's Memories, so runs
build on each other instead of repeating work.

Prior art this is modelled on: #34030 (earn), #34033 (confirmations), and #34034
(core-platform) removed unreachable code one owning team at a time. #34087,
#35478, #35571, and #36452 are smaller single-purpose deletions.

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

If this prompt contains the words DRY RUN, do every step except creating a
branch, pushing, opening a PR, or writing Memories. Instead, report the
candidate batch and evidence in your final reply.

## 0. Environment

- `source ~/.nvm/nvm.sh && nvm install && nvm use && corepack enable`
  (`.nvmrc` pins Node; the repo needs Yarn 4 via corepack).
- `yarn install --immutable`. Only use yarn, never npm/npx.
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
<!-- - YYYY-MM-DD | <branch> | <owner set> | <PR title> | files: a, b, c -->
## Done
<!-- - YYYY-MM-DD | <owner set> | merged|closed | <branch> | <n> files -->
## Do not touch
<!-- - <path> | reason (false positive, reviewer said keep, closed PR, ...) -->
## Notes
<!-- detector false-positive patterns learned over time -->
```

For every entry under "Open PRs":
- If none of its files exist on `origin/main` anymore, the PR merged. Move it
  to "Done".
- If `git ls-remote --heads origin <branch>` returns nothing and the files
  still exist on main, it was closed unmerged. Move it to "Done" as closed and
  add its files to "Do not touch" with reason "PR closed unmerged".
- Otherwise it is still open. If you can read its review comments through any
  available tool, record any "keep this" feedback under "Do not touch".

WIP limit: if 3 or more PRs are still open, STOP. Update Memories, open
nothing, and reply with a one-line status. Reviewers must not be flooded.

## 2. What counts as "completely dead"

In scope (strongest evidence first):
1. Source files under `app/` with zero inbound references anywhere in the
   repo.
2. Source files referenced only by their own co-located `*.test.*`,
   `*.view.test.*`, `*.stories.*`, or `__mocks__` files. Delete the tests,
   stories, and snapshots together with the file.
3. Barrel `index.ts`/`index.js` re-export files that nothing imports.
4. Cascade: files that become dead only because of this batch, within the
   same owner set.
5. Exports in a live file that are neither imported anywhere nor used
   locally. Remove only the export and its now-unused private helpers, and
   only when (1)-(4) don't fill the batch.

Out of scope. Never delete:
- Anything referenced by a string, glob, or path outside import statements:
  `metro.config.js`, `babel.config*.js`, `jest.config*.js`, `.storybook/`,
  `.github/`, `scripts/`, `sonar-project.properties`, `app.config.js`,
  `index.js`, `react-native.config.js`, `fingerprint.config.js`, `ota.config.js`.
- Code inside or only used from code fences (`///: BEGIN:ONLY_INCLUDE_IF`,
  `///: BEGIN:EXCLUDE_IF`). It is live in another build type (flask/beta/qa).
- Platform-specific files (`*.ios.*`, `*.android.*`, `*.native.*`). Metro
  resolves them from an extensionless import of the base name.
- Code behind feature flags or A/B tests. That is "unreleased", not dead.
  Removing it is a product decision.
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
  deeplink handlers, `Routes` constants, analytics event names, or anything
  referenced from `docs/` as a supported API.

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

## 4. Find and prove candidates

Build the candidate list with a throwaway script in `/tmp`. Never commit
detector code. Parse import/export-from/require/dynamic import/`jest.mock`/
`jest.requireActual` specifiers in every tracked `*.{js,jsx,ts,tsx,mjs,cjs}`
file. Resolve relative paths, `#app/*` -> `app/*`, `images/*` -> `app/images/*`,
and bare `app/...` paths (`baseUrl` is the repo root). Try extensions
`.ts .tsx .js .jsx .json` plus `.ios.* .android.* .native.*`, and `/index.*`.
`yarn dlx knip` with a config in `/tmp` is fine as a second opinion. Never
trust a detector alone.

For EACH candidate, collect evidence before deleting:
- `rg -n --hidden -g '!node_modules' -g '!.git' '<basename-without-ext>'`
  across the whole repo. Every hit must be the file itself, a co-located
  test/story/snapshot being deleted with it, a comment/CHANGELOG mention, or a
  provably unrelated identifier. Also search for the directory name when
  deleting an `index.*`.
- Check for dynamic/indirect use: `require(` with template strings,
  `React.lazy`, string keys in navigation/registry/allowlist objects (e.g.
  TemplateRenderer `safeComponentList`), and `testID` constants used by
  `tests/` page objects.
- `git log -3 --format='%h %ad %s' --date=short -- <file>`. If the file was
  added or meaningfully changed in the last 30 days, skip it. It is probably
  mid-rollout. Record it under Notes so you can revisit it later.

If any check is ambiguous, skip the candidate. If it is a detector pattern,
add it to "Notes" or "Do not touch".

## 5. Size the batch

- Prefer one cohesive area (same feature folder, or the same kind of thing,
  e.g. "unused barrel files in components/Base") so one reviewer can follow it.
- Target 3-10 touched files and at most ~400 deleted lines. Hard cap: 15 files
  (snapshot files don't count).
- If more qualifies, take the most self-contained subset and record the rest
  under Notes as the next batch. Later runs open follow-up PRs. Never open
  more than one PR per run.
- A batch with a single file is fine if that is all that is left for the
  owner set.

## 6. Delete and clean up

- Delete the dead files plus their co-located tests, stories, and obsolete
  `__snapshots__/*.snap`.
- Remove now-empty directories, now-unused imports in touched files, stale
  `.eslintrc.js` override entries, and `sonar-project.properties` /
  `coverage-thresholds.json` entries for deleted paths, as long as those files
  share the PR's owner set or are unowned.
- Do not refactor, rename, reformat, or "improve" surviving code. Deletions
  only, plus the minimal edits above.

## 7. Verify (all must pass, or drop the offending file and retry)

- `yarn lint:tsc`
- `yarn eslint <every touched or parent directory>`
- `yarn jest <parent directories of deleted files>` and the tests of any file
  you edited
- Re-run the `rg` evidence check for every deleted basename
- `git status` / `git diff --stat`. Only intended files changed, and every
  touched file resolves to the chosen owner set.

If verification can't pass after dropping problem files, open nothing. Record
what happened in Notes and stop.

## 8. Open the PR

- Branch name: `cursor/remove-dead-code-<area>-<yyyymmdd>`. Commit message =
  PR title.
- Title (Conventional Commits, checked by `pr-title-linter`):
  `chore(<area>): remove unused <short what>`, e.g.
  `chore(base): remove unused ModalDragger and RangeInput`.
- Open as a DRAFT using `.github/pull-request-template.md`. Keep every
  `mms-check` directive and fill in every section:
  - Description: what was removed, the owner set (e.g. "All touched files have
    no CODEOWNERS entry" or "All files owned by @MetaMask/swaps-engineers"),
    and a table of deleted path | why it is dead (zero refs / only own test /
    unused barrel / cascade). Say "No user-facing behavior change."
  - `CHANGELOG entry: null`
  - Related issues: replace the blank `Fixes:` with
    `Refs: proactive dead-code cleanup (see #34030)`.
  - Manual testing: delete the template Gherkin block and write `N/A — deletes
    code with no inbound references; verified with yarn lint:tsc, eslint and
    jest on affected directories.`
  - Screenshots: `N/A — no UI change`
  - Author checklist: check the items you actually assessed.
- Do not request specific reviewers. CODEOWNERS handles review routing.

## 9. Update Memories and report

- Add the PR to "Open PRs" with its branch, owner set, title, and full file
  list. Update `current`, `exhausted`, Notes, and "Do not touch".
- Keep `MEMORIES.md` under ~200 lines. Prune "Done" entries older than 60 days
  into a one-line count per owner set.
- Final reply: PR link (or why none was opened), owner set, files deleted,
  line count, and how many candidates remain for the current owner set.
````

## Manual dry run

Click **Test** in the automation editor with `DRY RUN` added to the
instructions. The run reports the batch it would open without pushing
anything. Remove `DRY RUN` before you activate the schedule.

## Notes

- Measured on `main` in Oct 2026: about 3,300 of 15,000 `app/` source files
  resolve to no CODEOWNERS owner. A rough import-graph scan found about 70
  unowned files with zero inbound imports and about 40 referenced only by
  their own tests. At one PR per weekday that is a few weeks of work before
  the queue moves to the first team.
- Known detector false positives in this repo: config-string references
  (`app/shims/*` from `metro.config.js`), Reassure `*.perf-test.tsx` globs,
  platform-extension files, and code-fenced flask/beta code.
- The automation never touches feature-flagged code. Removing a flag after a
  rollout is a separate, product-owned change.
