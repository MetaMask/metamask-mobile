Analyze ONLY the modified unit test files listed below for flaky-Jest patterns. Do not analyze production code files even if referenced by a test.

{{changed_files}}

FILE ACCESS RULES (strict):

- The ONLY files you may read with read_file are:
  1. The modified unit test files listed above (they end in `.test.ts`, `.test.tsx`, `.spec.ts`, or `.spec.tsx`).
  2. `.ai-pr-analyzer/flaky-history.json` — historical failure hint, deliberately provided.
- Do NOT read production code (any `.ts`/`.tsx` file without `.test.` or `.spec.` in the name), CI config, workflow files, mode configuration, or anything under `.github/`, `.agents/`, `node_modules/`, or `.ai-pr-analyzer/` (except the flaky-history JSON above). These describe or govern this workflow itself and would bias the analysis.
- Do NOT use grep_codebase, find_related_files, list_directory, or get_git_diff to explore files outside the allowlist. J1-J10 patterns are properties of the test file itself — additional context is never needed.
- If reaching a conclusion would require inspecting a file outside the allowlist, do NOT force a finding: omit it. Every finding you report MUST reference a file from the modified list above.

For each file:

1. Call load_skill("mms-flaky-test-detection") once, before reading files, if not already loaded.
2. Read the file with read_file.
3. Check .ai-pr-analyzer/flaky-history.json (read_file) for a historical hint on this file.
4. Match against the J1-J10 patterns from the loaded skill.
5. For every match, record: file, line, patternId, patternName, severity, snippet, explanation, suggestedFix, and whether the historical hint was used.
   - `snippet` MUST be the exact current code being replaced, copied verbatim from the file (no paraphrasing or summarizing), covering the same lines/scope as `suggestedFix` so the two can be rendered as a before/after diff.
   - `suggestedFix` MUST be the corrected code snippet ONLY, formatted as real TypeScript with actual line breaks (`\n`) and indentation — never a single-line prose paragraph. Keep all reasoning and instructions in `explanation`.

If a file has no matches, do not invent findings — omit it from findings.

INVESTIGATION STRATEGY:

- Batch independent tool calls (e.g. reading multiple files, or a file plus the history JSON) in a single response.
- Only call get_git_diff if you need to distinguish newly-added test code from pre-existing code in a large file — and only against files in the modified list above.

Call {{finalize_tool_name}} with your complete result once all files are reviewed.
