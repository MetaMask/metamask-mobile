# Performance Failure Autofix

Follow the skill at `.agents/skills/performance-failure-autofix/SKILL.md` and the
canonical guide at `docs/testing/performance-failure-autofix.md`.

## Input

`$ARGUMENTS` should be a GitHub Actions run URL or run id for a MetaMask Mobile
performance workflow. If empty, ask for the run URL.

## Instructions

1. All agent output (analysis, Slack, PR, commits) must be in English.
2. Investigate every failed performance test in the run: Actions artifacts,
   Playwright screenshots, and BrowserStack session videos when
   `BROWSERSTACK_*` secrets are available.
3. Classify each failure (`quality_gate_only`, `test_bug`, `app_regression`,
   `selector_flake`, `infra`, `unknown`).
4. DM Javier Vera on Slack (`channel_id: UEYQL2PEV`) using the skill template.
5. Open a draft PR with a proposed fix only when the failure is not
   quality-gates-only and a high-confidence minimal fix exists in the app or
   performance test. Do not raise quality-gate thresholds unless explicitly
   requested.
