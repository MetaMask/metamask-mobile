# pr-template-comment

Sticky-comment lifecycle for the PR template CI check. Ensures the PR always
carries at most one bot comment reflecting the current set of failures, and
that the comment is deleted once all checks pass.

## Relationship to other modules

| Module | Responsibility |
|---|---|
| `pr-template-checks.ts` | Produces the list of failure reasons |
| `pr-template-comment.ts` | Renders and persists those reasons as a GitHub comment |
| `check-template-and-add-labels.ts` | Orchestrator — calls both modules, then exits |

## How the sticky comment works

Every comment posted by this module starts with an invisible HTML marker
(`<!-- pr-template-checks -->`). This is how subsequent runs identify "their"
comment among all PR comments, so they can update it in place rather than
posting a new one each time the workflow runs.

The design guarantees at most one bot comment per PR at any time:

```
run N   → failures exist → comment absent  → create
run N+1 → failures exist → comment present → update (or skip if unchanged)
run N+2 → all pass       → comment present → delete
run N+3 → all pass       → comment absent  → no-op
```

## API

### `renderFailureComment(reasons, isDraft)`

Returns the markdown body for the sticky comment. The marker is **not**
included — `upsertStickyComment` prepends it before writing to GitHub.

The rendered comment includes:
- a fixed heading
- a tone line that differs between draft PRs (informational) and ready-for-review PRs (blocking)
- one bullet per failure reason
- a link to `docs/readme/ready-for-review.md`

### `upsertStickyComment(octokit, labelable, body)`

Creates, updates, or deletes the sticky comment:

- `body: string` — creates if absent, updates if content changed, skips if unchanged
- `body: null` — deletes the comment if one exists, does nothing otherwise

The function is best-effort: any GitHub API error is caught and logged as a
warning, so a permission or network issue never fails the CI job. The
exit-status check in the orchestrator remains the source of truth for branch
protection.
