Analyze ONLY the modified unit test file listed below for flaky-Jest patterns. Do not analyze production code files even if referenced by a test.

{{changed_files}}

FILE ACCESS RULES (strict):

- The ONLY files you may read with read_file are:
  1. The modified unit test file listed above (it ends in `.test.ts`, `.test.tsx`, `.spec.ts`, or `.spec.tsx`).
  2. `.ai-pr-analyzer/flaky-history.json` — historical failure hint, deliberately provided.
- Do NOT read production code (any `.ts`/`.tsx` file without `.test.` or `.spec.` in the name), CI config, workflow files, mode configuration, or any path other than the listed file and the history JSON above. Those other paths describe or govern this workflow itself and would bias the analysis.
- Do NOT use grep_codebase, find_related_files, list_directory, or get_git_diff to explore files outside the allowlist. J1-J10 patterns are properties of the test file itself — additional context is never needed.
- If reaching a conclusion would require inspecting a file outside the allowlist, do NOT force a finding: omit it. Every finding you report MUST reference the listed file above.

For the listed file:

1. Call load_skill("mms-flaky-test-detection") once, before reading files, if not already loaded.
2. Read the file with read_file.
3. Read .ai-pr-analyzer/flaky-history.json (read_file) and check whether this file has a `"flaky": true` entry. That decides your scope: whole current file when it does, this PR's diff when it does not.
4. Use get_git_diff for this file. For a file without a history entry, it defines what you may report (introduced or worsened here). For a file with one, it only tells you whether the pattern is new or pre-existing — report it either way.
5. Match against the J1-J10 patterns from the loaded skill, but report a match only when you can demonstrate a concrete cross-test state leak or timing/scheduling mechanism. For J3/J9, inspect the relevant enclosing Jest hooks and identify the state that leaks, the mutation, and the later observation. For J4/J6/J8/J10, report only when the snippet already contains that pattern's defining construct, and `suggestedFix` must edit that construct rather than insert it; for J5, a mock store/state must exist in the file.
6. For every match, record: file, line, patternId, patternName, severity, snippet, explanation, suggestedFix, and `historicalHintUsed` (true when that file has a `"flaky": true` history entry, false otherwise).
   - `snippet` MUST be the exact current code being replaced, copied verbatim from the file (no paraphrasing or summarizing), covering the same lines/scope as `suggestedFix` so the two can be rendered as a before/after diff.
   - `suggestedFix` MUST be the corrected code snippet ONLY, formatted as real TypeScript with actual line breaks (`\n`) and indentation — never a single-line prose paragraph. Keep all reasoning and instructions in `explanation`.

OUTPUT BOUNDS (the finalize tool call must fit in one response):

- Report at most 5 findings, highest severity first. Drop lower-severity matches rather than overflowing.
- `snippet` is the minimal contiguous lines containing the construct, at most 12 lines.
- `suggestedFix` is at most 20 lines.
- `explanation` is at most 2 sentences.
- `reasoning` is at most 3 sentences.

If the file has no matches, do not invent findings — omit it from findings. For a historically flaky file that is a substantive result: the reviewer reads it as "the same-SHA failure has no provable pattern left in this file", so never omit a pattern just because history already flagged the file, and never add one just because it did.

INVESTIGATION STRATEGY:

- Batch independent tool calls (e.g. reading the file plus the history JSON) in a single response.
- Call get_git_diff once against the listed file before reporting findings. Its purpose is to scope a file without a history entry to introduced/worsened risks, and to let you say in `explanation` whether a historically flaky file's pattern is new or pre-existing.

Call {{finalize_tool_name}} with your complete result once the file is reviewed.
