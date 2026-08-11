# Swaps performance scenarios

## SWAPS-PERF-001 — Open Swaps and fetch a 1 ETH quote

Runs one non-transactional iOS Simulator scenario against the installed wallet:

1. Open Swaps from the unlocked Wallet on Ethereum.
2. Select Ethereum USDC as the destination token.
3. Enter `1` ETH.
4. Wait until the first positive destination amount is visible.

The scenario uses the project-local `mm` CLI, real app state, and the real network. It preserves wallet data and always cleans up the `mm` session.

## Prerequisites

- A booted iOS Simulator with a development build of MetaMask installed.
- The installed wallet is unlocked and showing the Wallet view on Ethereum.
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

This setup launch may refresh the app if it is not already healthily attached to Metro. After it completes, manually unlock MetaMask and leave it on Wallet with Ethereum Mainnet selected. The scenario command requires and reuses this active session; it does not launch or refresh the app.

The repo-local `mms-swaps-performance-analysis` skill owns the full preflight, prepare, run, analyze, and cleanup workflow. The underlying commands are shown here for direct use.

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

Write a regenerated Markdown report to a file:

```bash
yarn performance:swaps analyze --latest --output swaps-report.md
```

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
```

The artifact includes a snapshot of the scenario identity and description, driver wall-clock phase durations, sanitized JS `fetch` metadata, targeted render counts, and sanitized console warnings/errors. URLs are reduced to host plus a normalized path; request bodies, response bodies, headers, query strings, wallet addresses, and API keys are not stored.

Artifacts use the current schema only while the tooling foundation is being established. The analyzer rejects artifacts missing the current scenario ID, name, or description rather than migrating older report shapes.

## Structure

- `scenarios/` owns scenario metadata, registration, and deterministic simulator steps.
- `capture/` owns exact source instrumentation, the generated render probe, and Hermes collection.
- `analysis/` owns artifact validation, metric summaries, findings, and Markdown formatting.
- `cli/` owns orchestration and user-facing commands.

These scenarios are intended for repeatable relative comparisons on the same host and simulator. Their driver wall-clock timings include `mm`/idb observation overhead and are not production quality gates. Collect multiple runs per revision before drawing performance conclusions.
