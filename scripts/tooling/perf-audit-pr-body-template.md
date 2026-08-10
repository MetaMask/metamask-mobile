# Perf audit PR body helper (automation)

Use when opening PRs from weekly performance audit Easy fixes.

**Script:** `scripts/tooling/open-perf-audit-pr.sh` — generates a full `.github/pull-request-template.md`-aligned body and runs `gh pr create --draft` or `gh pr edit`.

Requires `GH_TOKEN` with `pull_requests: write` in the Cloud Environment (Cursor App token can push but often cannot create/edit PRs via API).

## Jira link format (clickable in GitHub Fixes section)

```markdown
Fixes: [TMCU-XXXX](https://consensyssoftware.atlassian.net/browse/TMCU-XXXX)
```

CI validates a non-empty `Fixes:` / `Closes:` / `Refs:` line in **Related issues** (`pr-template-checks.ts`). Markdown links are accepted.

## Required sections (from `.github/pull-request-template.md`)

| Section | Easy perf fix default |
|---------|----------------------|
| Description | What changed + why (re-render stability) |
| Changelog | `CHANGELOG entry: null` (not user-facing) |
| Related issues | `Fixes: [TMCU-XXXX](https://consensyssoftware.atlassian.net/browse/TMCU-XXXX)` |
| Manual testing | Gherkin block citing `yarn jest <scoped test>` |
| Screenshots | `N/A — internal hook memoization; no user-facing UI change` |
| Author checklist | Leave unchecked in draft; human completes before ready-for-review |

See `docs/readme/ready-for-review.md` before marking ready for review.

## Automation prompt snippet

After `git push` for each Easy ticket:

```bash
./scripts/tooling/open-perf-audit-pr.sh \
  TMCU-1258 fix/tmcu-1258-... \
  "perf(homepage): ... (TMCU-1258)" \
  "Memoize ..." \
  "app/components/.../foo.test.ts"
```

Slack row format:

```text
• <jira|TMCU-1258> — summary → <pr-url|#34553>
```

## Existing PRs (2026-08-10 Easy fixes)

| Jira | PR |
|------|-----|
| TMCU-1258 | https://github.com/MetaMask/metamask-mobile/pull/34553 |
| TMCU-1260 | https://github.com/MetaMask/metamask-mobile/pull/34554 |
| TMCU-1232 | https://github.com/MetaMask/metamask-mobile/pull/34555 |
| TMCU-1230 | https://github.com/MetaMask/metamask-mobile/pull/34556 |
| TMCU-1231 | https://github.com/MetaMask/metamask-mobile/pull/34557 |

Paste bodies from `.tmp/pr-bodies/tmcu-*.md` (or re-run script with GH_TOKEN) to align descriptions with template.
