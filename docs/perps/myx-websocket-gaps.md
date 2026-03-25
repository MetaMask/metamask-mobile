# MYX SDK WebSocket Gaps

## Summary

MetaMask has fully wired WebSocket subscriptions for positions and orders using the MYX SDK (`@myx-trade/sdk` v1.0.6). Authentication, subscription, and callback handling are all implemented. However, **the MYX WebSocket server does not push data through `subscribePosition()` or `subscribeOrder()` channels**, forcing us to rely on REST polling as a fallback.

We have a standalone PoC that reproduces this: `scripts/perps/myx-poc/wsSubscriptions.ts`.

## What We Implemented

1. **WebSocket auth**: `subscription.auth()` called after REST `myxClient.auth()` in `MYXClientService.#doAuthenticate()` — succeeds on both testnet and mainnet
2. **Position subscription**: `subscription.subscribePosition(callback)` — resolves without error
3. **Order subscription**: `subscription.subscribeOrder(callback)` — resolves without error
4. **Hybrid approach**: WS subscriptions wired alongside REST polling heartbeat — when WS starts pushing, updates will be instant with REST as safety net

## The Problem: Server Does Not Push

| Step                                     | Result                        |
| ---------------------------------------- | ----------------------------- |
| `subscription.connect()`                 | OK                            |
| `subscription.auth()`                    | OK (after `myxClient.auth()`) |
| `subscription.subscribePosition(cb)`     | Resolves without error        |
| `subscription.subscribeOrder(cb)`        | Resolves without error        |
| Callback invocations after 60s           | **0 events**                  |
| Open a position during listening window  | **Still 0 events**            |
| Close a position during listening window | **Still 0 events**            |

Tested on:

- **Testnet** (chainId 59141, Linea Sepolia) — 0 events
- **Mainnet** (chainId 56, BNB Chain) — 0 events

For comparison, `subscribeKline()` and `subscribeTickers()` on the same WebSocket connection work correctly and deliver real-time data.

## PoC to Reproduce

```bash
# From repo root
cd scripts/perps/myx-poc
NETWORK=testnet npx tsx wsSubscriptions.ts

# Or with a position opened during the listening window:
NETWORK=testnet npx tsx wsSubscriptions.ts --with-trade
```

**Requirements**: `.myx.env` file with `ADDRESS`, `PRIVATE_KEY`, `MYX_APP_ID_TESTNET`, `MYX_API_SECRET_TESTNET`.

**Expected output** (current):

```
subscribePosition: registered
subscribeOrder: registered
Listening for WS events (60s)...
Total WS events received: 0
NO WebSocket push events received.
```

**Expected output** (desired):

```
subscribePosition: registered
subscribeOrder: registered
[2.1s] WS POSITION event: isArray: true, length: 1
[2.1s] WS ORDER event: isArray: true, length: 0
```

## Impact on MetaMask

Without WS push for positions/orders, we REST-poll every 5 seconds. This means:

- **5s latency** after opening/closing positions before UI updates
- **Higher API load** — repeated full fetches vs incremental WS updates
- **Worse UX** compared to providers with full WS streaming

## Questions for MYX

1. Are `subscribePosition` / `subscribeOrder` intended to push real-time updates? If so, what conditions must be met?
2. Is there a server-side configuration or feature flag needed to enable private WS push?
3. Is there a timeline for enabling these channels?
4. Are there any additional parameters or setup steps not documented in the SDK?

## Current Architecture

```
MYXClientService.#doAuthenticate()
  ├── myxClient.auth({ signer, walletClient, getAccessToken })   ← REST auth
  └── myxClient.subscription.auth()                               ← WS auth (works)

MYXProvider.subscribeToPositions()
  ├── clientService.subscribeToPositions(wsCallback)               ← WS (registered, no push)
  └── REST poll every 5s via getPositions()                        ← Fallback (works)

MYXProvider.subscribeToOrders()
  ├── clientService.subscribeToOrders(wsCallback)                  ← WS (registered, no push)
  └── REST poll every 5s via getOpenOrders()                       ← Fallback (works)
```

## Working WebSocket Channels

| Channel          | SDK Method         | Status  |
| ---------------- | ------------------ | ------- |
| Tickers (prices) | `subscribeTickers` | Working |
| Klines (candles) | `subscribeKline`   | Working |

## Non-Functional WebSocket Channels

| Channel   | SDK Method          | Status                            |
| --------- | ------------------- | --------------------------------- |
| Positions | `subscribePosition` | Registers OK, server doesn't push |
| Orders    | `subscribeOrder`    | Registers OK, server doesn't push |
| Account   | (none)              | No SDK method exists              |
| Fills     | (none)              | No SDK method exists              |
