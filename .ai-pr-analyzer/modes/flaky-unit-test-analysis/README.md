# `flaky-unit-test-analysis` mode

Custom [`MetaMask/ai-analyzer`](https://github.com/MetaMask/ai-analyzer) mode that reviews **only the modified Jest unit test files** in a PR for known flaky-test patterns (J1–J10 from the [`flaky-test-detection`](https://github.com/MetaMask/skills/blob/main/domains/coding/skills/flaky-test-detection/skill.md) skill) and emits structured findings with educational fix suggestions.

Consumed by [`.github/workflows/flaky-unit-test-detection.yml`](../../../.github/workflows/flaky-unit-test-detection.yml). Not a shipped built-in — this is a Tier 3 fully-custom mode defined entirely in this repo.

## Files

| File                   | Purpose                                                                          |
| ---------------------- | -------------------------------------------------------------------------------- |
| `mode.yaml`            | Mode identity — `id`, `finalizeToolName`, `outputFile`                           |
| `system-prompt.md`     | AI role, tool-use guidance, and pattern list (uses `{{template_vars}}`)          |
| `task-prompt.md`       | Per-run instructions, receives `{{changed_files}}`                               |
| `finalize-schema.json` | JSON Schema the AI must satisfy when calling `finalize_flaky_unit_test_analysis` |
| `fallback.json`        | Deterministic `conservative` / `empty` results when the AI can't complete        |

The J1–J10 pattern reference is **not** duplicated here. It is loaded on demand via the analyzer's `load_skill` tool, from a copy of `mms-flaky-test-detection` synced by `yarn skills` (CI does this with the cloud-agent bootstrap; see workflow). This keeps a single source of truth in `MetaMask/skills` and prevents content drift.

## Output artifact

Written to `.ai-pr-analyzer/flaky-ai-analysis.json` (relative to the workspace, per `outputFile` in `mode.yaml`). Consumed by `.github/scripts/flaky-sticky-comment.mjs`.

Shape (matches `finalize-schema.json`):

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
  "reasoning": "1 of 1 analyzed file contains a J1 pattern matching its historical failure signature."
}
```

`findings: []` with `analyzedFiles` populated means "reviewed, nothing found" — Stage 3 (sticky comment) uses that distinction for its four-state logic (create / update / no-op / all-clear).

## Editing the mode

- **Prompt tweaks**: edit `system-prompt.md` / `task-prompt.md`. The analyzer supports `{{prompt_context}}`, `{{changed_files}}`, `{{tools_section}}`, `{{skills_section}}`, `{{max_iterations}}`, `{{finalize_tool_name}}` and more — see [MetaMask/ai-analyzer docs/adding-a-new-mode.md](https://github.com/MetaMask/ai-analyzer/blob/v1/docs/adding-a-new-mode.md).
- **Schema changes**: keep `finalize-schema.json` and `fallback.json` in sync (both must satisfy the same shape). Any downstream consumer (the sticky-comment script) must be updated too.
- **Pattern reference changes**: do **not** edit `.ai-pr-analyzer/skills/mms-flaky-test-detection.md` — it is generated. Edit the source at [`MetaMask/skills/domains/coding/skills/flaky-test-detection/skill.md`](https://github.com/MetaMask/skills/blob/main/domains/coding/skills/flaky-test-detection/skill.md) and re-run `yarn skills`.
