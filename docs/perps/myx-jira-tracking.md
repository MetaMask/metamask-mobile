# MYX Jira Tracking

## Current PR: `fet/perps/myx-reads-write`

### Issues Addressed (In Progress)

| Jira     | Summary                           | Status                                                                                 |
| -------- | --------------------------------- | -------------------------------------------------------------------------------------- |
| TAT-2471 | Feature flag                      | Feature flag `MM_PERPS_MYX_PROVIDER_ENABLED` integrated, version-gated                 |
| TAT-2472 | Perps Home - Selector UI          | Selector bottom sheet built (PerpsProviderSelectorSheet + Badge). No design review yet |
| TAT-2531 | Perps Home - Selector Logic       | Provider+network switching implemented and CDP-validated. All 4 combos work            |
| TAT-2473 | Perp Market - Selector logic      | Market list updates correctly on provider/network switch. Cache invalidation fixed     |
| TAT-2474 | Perp Market - Price data on chart | MYX candles (REST+WS) and price polling implemented. Both networks                     |
| TAT-2475 | Perp Market - Stats data          | Funding, OI, volume, 24h change from MYX API. Inactive pools filtered                  |
| TAT-2580 | Markets view - MYX Markets        | MYX markets list. Testnet: 1 active, Mainnet: 3 active pools                           |
| TAT-2524 | Cleanup: provider switch cache    | Composite provider:network cache key. Fills, candles, topOfBook invalidated            |
| TAT-2476 | Protocol feature map config       | Needed to hide unsupported MYX features. Not yet implemented                           |

### What's Validated (CDP)

- Provider switching: HL ↔ MYX on both mainnet and testnet
- Market data: prices, funding rates, OI, volume
- Candles: REST fetch + WebSocket streaming
- Price streams: real-time price updates via WS
- Cache invalidation: composite keys prevent stale data across provider/network switches

### What's NOT Validated

- Authentication (auth code exists but was never validated with real credentials)
- Any authenticated reads (getPositions, getOrders, getAccountState)
- Any writes (placeOrder, closePosition, etc.)

---

## Next PR: Auth + Read Subscriptions

| Jira     | Summary                        | What to Do                                        |
| -------- | ------------------------------ | ------------------------------------------------- |
| TAT-2462 | Positions read                 | Validate auth → getPositions with real data       |
| TAT-2508 | Historic trades/orders/funding | Validate getOrderFills, getFunding with real data |
| TAT-2476 | Protocol feature map           | Hide orderbook, TP/SL, limit orders for MYX       |
| TAT-2459 | Collateral gating              | Only show MYX when user has BNB assets            |

### Prerequisites

- Mainnet credentials from MYX team
- Auth validation endpoint confirmation
- Feature map design agreement

---

## Future PR: Trading Writes (Phase 2)

| Jira     | Summary              | What to Do                                 |
| -------- | -------------------- | ------------------------------------------ |
| TAT-2461 | Place order          | Implement placeOrder for MYX               |
| TAT-2477 | Place order (market) | Market order flow                          |
| TAT-2478 | Close position       | closePosition implementation               |
| TAT-2532 | Update margin        | updateMargin implementation                |
| TAT-2533 | Flip position        | Flip position direction                    |
| TAT-2534 | Update TP/SL         | updatePositionTPSL implementation          |
| TAT-2463 | Modify position      | Umbrella ticket for position modifications |

### Prerequisites

- Auth validated (from previous PR)
- Feature map implemented
- Testnet trading confirmed working

---

## Issues NOT In Scope

| Jira     | Summary                | Reason         |
| -------- | ---------------------- | -------------- |
| TAT-2503 | Provider metrics       | Not started    |
| TAT-2504 | Performance monitoring | Not started    |
| TAT-2505 | Error analytics        | Lower priority |
| TAT-2507 | Provider health checks | Lower priority |
| TAT-2509 | A/B testing            | Lower priority |
| TAT-2510 | User feedback          | Lower priority |
