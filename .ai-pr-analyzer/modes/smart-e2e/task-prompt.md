Analyze the changed files and the impacted codebase to:

1. Select E2E test tags to run so the changes can be verified safely with minimal risk
2. Determine if performance tests should run based on potential performance impact

AVAILABLE E2E TEST TAGS (these are the ONLY valid E2E tags - they come from tests/tags.js and are already provided here):
{{tag_catalog_e2e}}

AVAILABLE PERFORMANCE TEST TAGS (derived from tests/tags.performance.js; these are the ONLY valid performance tags - select when changes could impact app performance):
{{tag_catalog_performance}}

CHANGED FILES ({{file_count}} total):
{{changed_files}}

PERFORMANCE ANALYSIS SCOPE:
For performance_tests only, base your decision on the complete PR file set above, not only the most recent commit or synchronize event. This matters after rebases: if an older commit in the PR changes a performance-sensitive flow, select the relevant performance tags even when the latest commit only changes unrelated files.
Use get_git_diff when a file's actual PR diff is needed, but do not narrow performance_tests to the last commit.

Investigate efficiently (prefer several tool calls in one iteration). Prefer: load recommended skills + read the highest-impact diffs first, then finalize. Avoid long grep loops once the impacted flows are clear. In your FIRST tool batch, call load_skill for each skill listed under RECOMMENDED FOR THIS PR when skills are listed. Then call {{finalize_tool_name}} when ready. Before finalizing: verify you have included all dependent tags as specified in each tag's description above, and any HARD RULE SEED minimum tags. Include performance_tests in your final selection with selected_tags (empty array if no performance tests needed) and reasoning.
