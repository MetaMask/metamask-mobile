Analyze the changed files and the impacted codebase to:

1. Select E2E smoke test tags to run so the changes can be verified safely with minimal risk

Performance tests are outside this selection. Do not choose performance tags.

AVAILABLE E2E TEST TAGS (these are the ONLY valid E2E tags - they come from tests/tags.js and are already provided here):
{{tag_catalog_e2e}}

CHANGED FILES ({{file_count}} total):
{{changed_files}}

Investigate efficiently (prefer several tool calls in one iteration). Prefer: load recommended skills + read the highest-impact diffs first, then finalize. Avoid long grep loops once the impacted flows are clear. In your FIRST tool batch, call load_skill for each skill listed under RECOMMENDED FOR THIS PR when skills are listed. Then call {{finalize_tool_name}} when ready. Before finalizing: verify you have included all dependent tags as specified in each tag's description above, and any HARD RULE SEED minimum tags. Do not include performance_tests.
