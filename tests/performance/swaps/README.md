# Swaps performance scenarios

## SWAPS-PERF-001 — Open Swaps and fetch a 1 ETH quote

Runs one non-transactional iOS Simulator scenario against the installed wallet:

1. Open Swaps from the unlocked Wallet on Ethereum.
2. Verify the source amount starts empty or at zero.
3. Select Ethereum USDC as the destination token.
4. Enter `1` ETH.
5. Wait until the first positive destination amount is visible.
6. Stop and read diagnostics, then return to Wallet before ending the `mm` session.

The scenario uses the project-local `mm` CLI, real app state, and the real network. It preserves wallet data and always cleans up the `mm` session.

## Prerequisites

- A booted iOS Simulator with a development build of MetaMask installed.
- The installed wallet is on Login or unlocked and showing the Wallet view on Ethereum.
- Metro is already running on port `8081` with the app attached.
- `idb` and `idb_companion` pass `yarn mm:doctor`.

Prepare the temporary dev-only render probes before Metro starts watching the source tree:

```bash
yarn performance:swaps prepare
yarn performance:swaps status
```

Require status `prepared`, then start Metro separately:

```bash
yarn watch:clean
```

The prepare command prints every modified source path plus the generated diagnostics helper path. It prints the same complete list when instrumentation is already prepared.

In another terminal, establish the simulator, accessibility, and Hermes session:

```bash
yarn mm launch --metro-port 8081
```

This setup launch may refresh the app if it is not already healthily attached to Metro. The scenario command requires and reuses this active session; it does not launch or refresh the app.

To let the scenario unlock a wallet that is on Login, set the password in the same terminal that will run the scenario:

```bash
export SWAPS_PERF_WALLET_PASSWORD='your-wallet-password'
```

The runner reads that environment variable, unlocks before installing diagnostics or measuring any phase, and does not print or store the password. Ethereum Mainnet must have been selected before the wallet was locked. If Login is visible and the variable is not set, the runner fails with that same export example. Unlock MetaMask manually and leave it on Wallet if you prefer not to set it.

Every run must start from Wallet. After the quote evidence is captured, the runner disables and reads the diagnostics collector before navigating back from Swaps. This lets the existing Bridge unmount cleanup clear the source amount without adding those cleanup renders or requests to the measurement. It then waits for the Wallet Swaps action before `mm cleanup` terminates the app. If navigation-based restoration fails, the artifact is marked failed and warns that the next run may not be clean.

Scenario 001 also checks the source amount immediately after opening Swaps. A positive prepopulated amount fails the run before destination selection, preventing stale Swaps state from being treated as a clean measurement.

The repo-local `mms-swaps-render-network-performance-analysis` skill owns the full preflight, prepare, run, analyze, and cleanup workflow. The underlying commands are shown here for direct use.

Run the deterministic scenario in another terminal:

```bash
yarn performance:swaps run --scenario 001
```

Use a different Metro port when needed:

```bash
yarn performance:swaps run --scenario 001 --metro-port 8082
```

Analyze the latest artifact:

```bash
yarn performance:swaps analyze --latest
```

The analyzer searches recursively across commit and scenario folders for `--latest` and always writes the Markdown report beside the JSON artifact using the same basename, replacing any existing sibling report. For example, `swaps-perf-001-example.json` produces `swaps-perf-001-example.md` in the same directory.

After collecting repeated runs for one scenario on one commit, compare every direct JSON artifact in that scenario folder:

```bash
yarn performance:swaps compare \
  test-reports/swaps-performance/<date>-<commit>/<scenario>
```

The command requires at least two successful runs and recommends at least three. It validates every direct JSON file with the current artifact schema, requires successful runs to have the same commit, scenario, platform, persisted preconditions, and ordered phase names, and sorts all runs by their persisted creation time. Failed runs appear in the report with their failure messages but do not contribute to performance ranges. Nested folders are not read.

The command writes or replaces `comparison.md` in the supplied scenario folder. It reports minimum, median, maximum, and absolute range for phase durations, total measured phase time, render counts, request totals, failures, console errors, and per-phase request counts. It also groups sanitized network requests across runs and reports call-frequency ranges and duration distributions. Findings identify failures, missing probes, intermittent requests, requests over five seconds, and phase or render-count ranges greater than 20 percent of their medians. That variability threshold is diagnostic guidance, not a regression gate.

Until artifacts record a working-tree fingerprint, the comparison assumes every run used a clean working tree at the recorded commit.

Always remove the temporary render probes, including after a failed run:

```bash
yarn performance:swaps cleanup
yarn performance:swaps status
```

The final status must report that instrumentation is not installed and all temporary probes and generated files are removed. Preparation and cleanup use exact `SWAPS_PERF_ANALYSIS` markers and refuse partial or ambiguous source changes.

## Output

Each run writes ignored JSON and Markdown artifacts under:

```text
test-reports/swaps-performance/
└── <date>-<commit>/
    └── <scenario>/
        ├── swaps-perf-001-<scenario>-<timestamp>.json
        ├── swaps-perf-001-<scenario>-<timestamp>.md
        └── comparison.md
```

For example, `2026-08-12-abc1234/open-swaps-fetch-one-eth-quote/` combines the UTC date from the artifact's `createdAt` value, its short Git commit hash, and its stable scenario slug. This keeps same-day runs for one revision grouped by scenario.

The artifact includes a snapshot of the scenario identity and description, driver wall-clock phase durations, sanitized JS `fetch` metadata, targeted render counts, and sanitized console warnings/errors. URLs are reduced to host plus a normalized path; request bodies, response bodies, headers, query strings, wallet addresses, and API keys are not stored.

Artifacts use the current schema only while the tooling foundation is being established. The analyzer rejects artifacts missing the current scenario ID, name, or description rather than migrating older report shapes.

## Structure

- `scenarios/` owns scenario metadata, registration, and deterministic simulator steps.
- `capture/` owns exact source instrumentation, the generated render probe, and Hermes collection.
- `analysis/` owns artifact validation, metric summaries, findings, and Markdown formatting.
- `cli/` owns orchestration and user-facing commands.

These scenarios are intended for repeatable relative comparisons on the same host and simulator. Their driver wall-clock timings include `mm`/idb observation overhead and are not production quality gates. Collect multiple runs per revision before drawing performance conclusions.
