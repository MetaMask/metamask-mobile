Analyze this PR and determine:

1. which Detox E2E tags must run
2. which performance tags must run

Use only tags from the catalog below.

{{prompt_context}}

{{changed_files}}

PRELOADED CRITICAL DIFF SUMMARY:
{{change_summary}}

Return your decision by calling `{{finalize_tool_name}}`.

Requirements before finalizing:

- Validate selected tags cover likely impacted user flows and shared dependencies.
- Use `performance_tests.selected_tags` as an empty array when performance testing is not needed.
- Keep reasoning specific to regression risk and potential bug introduction.
