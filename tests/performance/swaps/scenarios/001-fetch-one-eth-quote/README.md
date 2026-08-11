# SWAPS-PERF-001 — Open Swaps and fetch a 1 ETH quote

Measures the work performed while opening Swaps, selecting Ethereum USDC, entering `1` ETH, and waiting for the first positive quote.

The scenario requires an unlocked wallet on Ethereum Mainnet, an active `mm` and Hermes session, and the `swaps-render-v1` instrumentation profile prepared before Metro starts.

Run it from the repository root:

```bash
yarn performance:swaps run --scenario 001 --metro-port 8081
```

The run stops when the first quote becomes visible and never submits a transaction. Driver timings include `mm`/idb observation overhead, while JavaScript network capture excludes native networking and WebSockets.
