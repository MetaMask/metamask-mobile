# `flaky-unit-test-analysis` mode

Custom [`MetaMask/ai-analyzer`](https://github.com/MetaMask/ai-analyzer) mode that reviews **one Jest unit test file per invocation** for known flaky-test patterns (J1–J10 from the [`flaky-test-detection`](https://github.com/MetaMask/skills/blob/main/domains/coding/skills/flaky-test-detection/skill.md) skill) and emits structured findings with educational fix suggestions.

Consumed by [`.github/workflows/flaky-unit-test-detection.yml`](../../../.github/workflows/flaky-unit-test-detection.yml) through [`.github/scripts/flaky-unit-test-detection/flaky-ai-analysis.ts`](../../../.github/scripts/flaky-unit-test-detection/flaky-ai-analysis.ts), which runs this mode once per file (parallel, capped) and merges the results. Not a shipped built-in — this is a Tier 3 fully-custom mode defined entirely in this repo.

## Additive signals

Pattern findings and the deterministic same-SHA history written to `.ai-pr-analyzer/flaky-history.json` are independent. Neither suppresses the other, and the sticky comment labels their per-file combination:

| Combination           | What the reviewer concludes                                       |
| --------------------- | ----------------------------------------------------------------- |
| History + pattern     | Unfixed flake; the reported snippet is the likely cause           |
| History, no pattern   | Possibly fixed since, or environmental rather than a code pattern |
| History, not reviewed | No verdict — this mode never finished on that version of the file |
| Pattern, no history   | The pattern was most likely introduced by this PR                 |

"History, not reviewed" is explicit about why: analysis did not complete, the file was over the per-run cap, the AI stage was skipped on a fork PR, or the analyzer did not run. Stage 3 will not claim a file is pattern-free in those cases.

A `"flaky": true` history entry widens the AI's scope for that one file from the PR diff to the whole current file — a same-SHA failure means no fix landed, so a pre-existing pattern is the answer. Files without a history entry stay diff-scoped so PRs touching old test files are not buried in legacy findings. `historicalHintUsed` carries the distinction into [`flaky-sticky-comment.ts`](../../../.github/scripts/flaky-unit-test-detection/flaky-sticky-comment.ts).

## Per-file invocation

Each analyzer process receives a single path in `--changed-files`. Finalize payload bounds keep that call inside the model's output-token cap:

- `config.maxIterations: 6` in `mode.yaml`
- at most 5 findings, highest severity first
- `snippet` at most 12 lines; `suggestedFix` at most 20 lines
- `explanation` at most 2 sentences; `reasoning` at most 3 sentences

The runner retries a file once when the process exits non-zero or writes the conservative fallback.

## Files

| File                   | Purpose                                                                          |
| ---------------------- | -------------------------------------------------------------------------------- |
| `mode.yaml`            | Mode identity — `id`, `finalizeToolName`, `outputFile`, iteration/model config   |
| `system-prompt.md`     | AI role, tool-use guidance, and pattern list (uses `{{template_vars}}`)          |
| `task-prompt.md`       | Per-run instructions, receives `{{changed_files}}`                               |
| `finalize-schema.json` | JSON Schema the AI must satisfy when calling `finalize_flaky_unit_test_analysis` |
| `fallback.json`        | Deterministic `conservative` / `empty` results when the AI can't complete        |

The J1–J10 pattern reference is **not** duplicated here. It is loaded on demand via the analyzer's `load_skill` tool, from a copy of `mms-flaky-test-detection` synced by `yarn skills` (CI does this with the cloud-agent bootstrap; see workflow). This keeps a single source of truth in `MetaMask/skills` and prevents content drift.

## Output artifact

Each per-file run writes its own JSON. The Stage 2 runner merges those into `.ai-pr-analyzer/flaky-ai-analysis.json` (consumed by `.github/scripts/flaky-unit-test-detection/flaky-sticky-comment.ts`).

Shape (per-file finalize matches `finalize-schema.json`; the merged artifact adds `runs` and `maxFiles`):

```json
{
  "analyzedFiles": ["app/components/Views/Foo/Foo.test.tsx"],
  "findings": [
    {
      "file": "app/components/Views/Foo/Foo.test.tsx",
      "line": 42,
      "patternId": "J1",
      "patternName": "Missing act() on async state update",
      "severity": "critical",
      "snippet": "refreshControl.props.onRefresh();",
      "explanation": "Async prop callback triggers a state update outside act(), causing an intermittent race.",
      "suggestedFix": "await act(async () => { await refreshControl.props.onRefresh(); });",
      "historicalHintUsed": true
    }
  ],
  "confidence": 78,
  "reasoning": "app/components/Views/Foo/Foo.test.tsx: reviewed",
  "maxFiles": 10,
  "runs": [
    {
      "file": "app/components/Views/Foo/Foo.test.tsx",
      "status": "reviewed",
      "attempts": 1,
      "durationMs": 12000
    }
  ]
}
```

`runs[].status` is one of `reviewed`, `did_not_complete`, or `skipped_cap`.

`findings: []` with `analyzedFiles` populated means "reviewed, nothing found" — Stage 3 (sticky comment) uses that distinction for its four-state logic (create / update / no-op / all-clear).

## Editing the mode

- **Prompt tweaks**: edit `system-prompt.md` / `task-prompt.md`. The analyzer supports `{{prompt_context}}`, `{{changed_files}}`, `{{tools_section}}`, `{{skills_section}}`, `{{max_iterations}}`, `{{finalize_tool_name}}` and more — see [MetaMask/ai-analyzer docs/adding-a-new-mode.md](https://github.com/MetaMask/ai-analyzer/blob/v1/docs/adding-a-new-mode.md).
- **Schema changes**: keep `finalize-schema.json` and `fallback.json` in sync (both must satisfy the same shape). Any downstream consumer (the sticky-comment script) must be updated too.
- **Pattern reference changes**: do **not** edit `.ai-pr-analyzer/skills/mms-flaky-test-detection.md` — it is generated. Edit the source at [`MetaMask/skills/domains/coding/skills/flaky-test-detection/skill.md`](https://github.com/MetaMask/skills/blob/main/domains/coding/skills/flaky-test-detection/skill.md) and re-run `yarn skills`.
