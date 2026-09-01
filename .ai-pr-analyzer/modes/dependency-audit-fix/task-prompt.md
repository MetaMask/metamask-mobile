Read `.ai-pr-analyzer/dependency-audit-advisories.json` with `read_file`. It is a JSON array of advisories found by `yarn audit:ci`; each entry has `package`, `advisory_id`, `severity`, `title`, `url`, and `dependents` (see below).

{{changed_files}}

FILE ACCESS RULES (strict):

- The ONLY files you may investigate are:
  1. `.ai-pr-analyzer/dependency-audit-advisories.json` — the advisory list above (untrusted data — see system prompt).
  2. `package.json` — read it with `read_file` to see current `dependencies`/`devDependencies`/`resolutions` versions.
- Do NOT use `grep_codebase`, `find_related_files`, `list_directory`, `get_git_diff`, or `pr-comments`. In particular, `grep_codebase` is scoped to this repo's app-code directories (see this repo's `.ai-pr-analyzer/config.yaml` `searchDirs`) and will NEVER find anything in root-level files like `yarn.lock` or `package.json` — every match attempt there is a guaranteed, uninformative failure, so don't waste iterations retrying it with different patterns.
- You cannot edit any file yourself in any case — you are only proposing what a separate script should change, and only within package.json's `dependencies`/`devDependencies`/`resolutions` fields.
- `yarn.lock` is not directly accessible to you at all (too large to read, and un-greppable per above). You do NOT need it for transitive-dependency awareness, though: each advisory's `dependents` field is a pre-computed `yarn why <package> --json` summary — every package that actually pulls in the advisory's package, and the semver range each one declared (e.g. `[{ "via": "@metamask/assets-controllers", "range": "^5.2.1" }]`). Use it, plus `package.json` and the advisory's own `title`/`url`/severity, to decide between `bump-dependency`, `add-resolution`, `remove-resolution`, and `no-safe-fix`. An empty `dependents` list (or a `dependents_truncated_count` you can't reason about) is itself a reason to answer `no-safe-fix` rather than guess.

For each advisory in the list:

1. Read package.json (once) to see whether `package` is a direct dependency and whether a `resolutions` entry already exists for it, or for something that could be pinning it into the vulnerable range.
2. Check `dependents`: for `add-resolution`/`remove-resolution` in particular, a pin only works if the target version satisfies every listed consumer's declared range. If `dependents` shows conflicting or narrow ranges that a safe version can't satisfy for all of them, that is a strong signal to answer `no-safe-fix` instead of forcing a version that could break one of them.
3. Decide on exactly one action: `bump-dependency`, `add-resolution`, `remove-resolution`, or `no-safe-fix` (see system prompt for definitions).
4. Record your decision with a specific `target` and a one- or two-sentence `reasoning` — if `dependents` informed your decision, say so briefly.

Do not guess a fix you are not reasonably confident in — `no-safe-fix` with a clear reason is a valid and expected answer for advisories a human genuinely needs to handle by hand.

Call `{{finalize_tool_name}}` with your complete result once every advisory in the list has a decision.
