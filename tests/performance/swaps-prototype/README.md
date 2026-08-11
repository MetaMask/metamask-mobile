# Swaps performance analysis prototype

Runs one non-transactional iOS Simulator scenario against the installed wallet:

1. Open Swaps from the unlocked Wallet on Ethereum.
2. Select Ethereum USDC as the destination token.
3. Enter `1` ETH.
4. Wait until the first positive destination amount is visible.

The scenario uses the project-local `mm` CLI, real app state, and the real
network. It preserves wallet data and always cleans up the `mm` session.

## Prerequisites

- A booted iOS Simulator with a development build of MetaMask installed.
- The installed wallet is unlocked and showing the Wallet view on Ethereum.
- Metro is already running on port `8081` with the app attached.
- `idb` and `idb_companion` pass `yarn mm:doctor`.

Prepare the temporary dev-only render probes before Metro starts watching the
source tree:

```bash
yarn performance:swaps:prepare
yarn performance:swaps:status
```

Require status `prepared`, then start Metro separately:

```bash
yarn watch:clean
```

In another terminal, establish the simulator, accessibility, and Hermes session:

```bash
yarn mm launch --metro-port 8081
```

This setup launch may refresh the app if it is not already healthily attached to
Metro. After it completes, manually unlock MetaMask and leave it on Wallet with
Ethereum Mainnet selected. The prototype command requires and reuses this active
session; it does not launch or refresh the app.

The repo-local `mms-swaps-performance-analysis` skill owns the full preflight,
prepare, run, analyze, and cleanup workflow. The underlying commands are shown
here for direct use.

Run the deterministic scenario in another terminal:

```bash
yarn performance:swaps:prototype
```

Use a different Metro port when needed:

```bash
yarn performance:swaps:prototype --metro-port 8082
```

Analyze the latest artifact:

```bash
yarn performance:swaps:analyze --latest
```

Always remove the temporary render probes, including after a failed run:

```bash
yarn performance:swaps:cleanup
yarn performance:swaps:status
```

The final status must be `clean`. Preparation and cleanup use exact
`SWAPS_PERF_ANALYSIS` markers and refuse partial or ambiguous source changes.

## Output

Each run writes ignored JSON and Markdown artifacts under:

```text
test-reports/swaps-performance/
```

The artifact includes driver wall-clock phase durations, sanitized JS `fetch`
metadata, targeted render counts, and sanitized console warnings/errors. URLs
are reduced to host plus a normalized path; request bodies, response bodies,
headers, query strings, wallet addresses, and API keys are not stored.

This prototype is intended for repeatable relative comparisons on the same host
and simulator. Its driver wall-clock timings include `mm`/idb observation
overhead and are not production quality gates. Collect multiple runs per
revision before drawing performance conclusions.
