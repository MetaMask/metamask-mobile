# `dependency-audit-fix` mode

Custom [`MetaMask/ai-analyzer`](https://github.com/MetaMask/ai-analyzer) mode that proposes a fix for `yarn audit` advisories found by `yarn audit:ci`.

Consumed by [`scripts/attempt-audit-fix.ts`](../../../scripts/attempt-audit-fix.ts), invoked from [`.github/workflows/dependency-audit-escalation.yml`](../../../.github/workflows/dependency-audit-escalation.yml). Not a shipped built-in — this is a fully-custom mode defined entirely in this repo.

## Files

| File                   | Purpose                                                                      |
| ---------------------- | ---------------------------------------------------------------------------- |
| `mode.yaml`            | Mode identity — `id`, `finalizeToolName`, `outputFile`                       |
| `system-prompt.md`     | AI role, untrusted-input handling, and the four allowed proposal actions     |
| `task-prompt.md`       | Per-run instructions and file-access allowlist, receives `{{changed_files}}` |
| `finalize-schema.json` | JSON Schema the AI must satisfy when calling `finalize_dependency_audit_fix` |
| `fallback.json`        | Deterministic `conservative` / `empty` results when the AI can't complete    |

The AI never edits any file — it only investigates (`read_file` on package.json and the advisory context file) and returns a structured proposal. `scripts/attempt-audit-fix.ts` applies each proposed change itself, then re-runs the same `yarn dedupe` / `yarn constraints` / re-audit checks before trusting that a given advisory is actually fixed. A proposal that doesn't independently verify is discarded — the advisory stays in `manual`.

## Input artifact

`scripts/attempt-audit-fix.ts` writes `.ai-pr-analyzer/dependency-audit-advisories.json` before invoking the analyzer — a JSON array of the advisories `scripts/collect-audit-advisories.ts` collected (found by `yarn audit:ci`, minus anything already tracked by an open PR/issue or permanently accepted via `npmAuditIgnoreAdvisories` in `.yarnrc.yml`), e.g.:

```json
[
  {
    "package": "ms",
    "advisory_id": "TEST-0002",
    "severity": "high",
    "title": "...",
    "url": "...",
    "dependents": [
      { "via": "@metamask/controller-utils", "range": "^2.1.2" },
      { "via": "express", "range": "^2.0.0" }
    ]
  }
]
```

`dependents` is a `yarn why <package> --json` summary computed by `attempt-audit-fix.ts` itself (the AI has no shell access to run this, and `yarn.lock` is too large/un-greppable for it to read directly) — every package that actually depends on the advisory's package, deduped, with the semver range each one declared. This is what lets the AI judge whether an `add-resolution` pin would actually be safe for every consumer, not just whichever one it happened to guess about; a package with more distinct consumers than the cap (12) also gets a `dependents_truncated_count`.

This file (plus `package.json` and `yarn.lock`) is passed via `--changed-files` so the analyzer treats it as in-scope, and the task prompt tells the AI to `read_file` it directly — the advisory data is per-run and dynamic, so it can't live in a static prompt template.

## Output artifact

Written to `.ai-pr-analyzer/dependency-audit-fix.json` (per `outputFile` in `mode.yaml`). Shape (matches `finalize-schema.json`):

```json
{
  "fixes": [
    {
      "advisory_id": "TEST-0002",
      "package": "ms",
      "action": "no-safe-fix",
      "target": "",
      "reasoning": "Vulnerable Versions is '*' — every published version matches, so no version bump or resolutions pin can clear this advisory."
    }
  ],
  "confidence": 80,
  "reasoning": "Investigated 1 advisory: 1 direct dependency check via package.json."
}
```

## Editing the mode

- **Prompt tweaks**: edit `system-prompt.md` / `task-prompt.md`. See [MetaMask/ai-analyzer docs/adding-a-new-mode.md](https://github.com/MetaMask/ai-analyzer/blob/v1/docs/adding-a-new-mode.md) for the full template-variable reference.
- **Schema changes**: keep `finalize-schema.json` and `fallback.json` in sync (both must satisfy the same shape), and update the apply/verify logic in `scripts/attempt-audit-fix.ts` to match.
