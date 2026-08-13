# SWAPS-PERF-001 — Open Swaps and fetch a 1 ETH quote

Measures the work performed while opening Swaps, selecting Ethereum USDC, entering `1` ETH, and waiting for the first positive quote.

The scenario requires a wallet that is either on Login or unlocked on the Wallet view, with Ethereum Mainnet selected before locking or running. It also requires an active `mm` and Hermes session and the temporary Swaps performance instrumentation prepared before Metro starts. When starting on Login, set `SWAPS_PERF_WALLET_PASSWORD` using the instructions in the main Swaps performance README.

After opening Swaps, the scenario requires the source amount to be empty or zero. A positive prepopulated amount fails the run as stale state. After collecting the quote and stopping diagnostics, the scenario navigates back to Wallet so the Bridge unmount cleanup resets its inputs before the app is terminated.

Run it from the repository root:

```bash
yarn performance:swaps run --scenario 001 --metro-port 8081
```

The run stops when the first quote becomes visible and never submits a transaction. Driver timings include `mm`/idb observation overhead, while JavaScript network capture excludes native networking and WebSockets.
