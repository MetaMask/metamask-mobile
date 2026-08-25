# Swaps/Bridge Sentry reference

## Scope and measurement model

The unified swap/bridge view uses four manual Sentry spans. Each span's primary
measurement is its duration: the elapsed time between the `startTime` passed to
`trace()` and the `timestamp` passed to `endTrace()`, in milliseconds. The
`data` fields listed below are span attributes for context, not separate
measurements. These traces do not emit additional `setMeasurement` values.

`TraceOperation` is a coarse grouping key for performance dashboards. It
classifies the work being measured rather than repeating the trace name.

## Complete trace catalog

| TraceName (Sentry transaction name)                           | TraceOperation              | Panel title          | Emission locations                                                                                                                                                                                                                                                                                                                                       | What it measures                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------- | --------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TraceName.SwapViewLoaded` (`Swap View Loaded`)               | `bridge.screen.performance` | **Page Load**        | Start: `app/components/UI/Bridge/utils/swapBridgePageLoadTrace.ts:27`; finish: `app/components/UI/Bridge/hooks/useSwapBridgePageLoadTrace/index.ts:38` (ready) or `:61` (unmount)                                                                                                                                                                        | Unified swap/bridge view start → source and destination tokens plus the latest source balance are available. A prefilled amount also waits for the quote surface. Ends with `result: success` or `result: cancelled`.                                                                                                                               |
| `TraceName.SwapQuoteFetch` (`Swap Quote Fetch`)               | `bridge.data_fetch`         | **Quote Fetch**      | Start: `app/components/UI/Bridge/utils/swapQuoteFetchTrace.ts:63`; finish helper: `app/components/UI/Bridge/utils/swapQuoteFetchTrace.ts:33`; result handling: `app/components/UI/Bridge/hooks/useBridgeQuoteEvents/index.ts:105-127` and cancellation/error handling: `app/components/UI/Bridge/hooks/useBridgeQuoteRequest/index.ts:139-152, :187-212` | Quote request commit → first usable quote, no quotes, error, or cancellation. The trace starts before the 300 ms debounce, so the duration includes that user-perceived wait. Start attributes: `request_id`, `isRefresh`, `swap_type`, `src_chain_id`, `dest_chain_id`; end attribute: `result` (`success`, `no_quotes`, `error`, or `cancelled`). |
| `TraceName.SwapTokenSearch` (`Swap Token Search`)             | `bridge.data_fetch`         | **Token Search**     | Start: `app/components/UI/Bridge/hooks/useSearchTokens.ts:156`; finish: `app/components/UI/Bridge/hooks/useSearchTokens.ts:222`                                                                                                                                                                                                                          | Initial, non-pagination `/getTokens/search` request start → response parsing and result state update. Pagination requests are not separately traced. Start attributes: `chain_scope`, `query_length_bucket`; end attributes: `result` and `result_count_bucket`.                                                                                    |
| `TraceName.BridgeBalancesUpdated` (`Bridge Balances Updated`) | `bridge.data_fetch`         | **Balances Updated** | Start: `app/components/UI/Bridge/hooks/useLatestBalance/index.ts:137`; finish: `app/components/UI/Bridge/hooks/useLatestBalance/index.ts:164`                                                                                                                                                                                                            | EVM source-token balance refresh, including native `getBalance` or ERC-20 `balanceOf`, through the fetch result and state update. Non-EVM balances use controller data and do not emit this span. Attributes: `srcChainId`, `isNative`, and ending `result` (`success` or `error`).                                                                 |

The page-load span is started by the navigation flow at
`app/components/UI/Bridge/hooks/useSwapBridgeNavigation/index.ts:357` and by
the “Bridge again” flow at
`app/components/UI/Bridge/components/TransactionDetails/TransactionDetails.tsx:495`.

## Panel naming

Dashboard panels should use the generic UI interaction, not the raw
`TraceName` string:

| Panel title          | Backed by               |
| -------------------- | ----------------------- |
| **Page Load**        | `SwapViewLoaded`        |
| **Quote Fetch**      | `SwapQuoteFetch`        |
| **Token Search**     | `SwapTokenSearch`       |
| **Balances Updated** | `BridgeBalancesUpdated` |

Reserve a `Swap` or `Bridge` prefix in a panel title for a trace that is
genuinely transaction-type-specific, such as a future cross-chain-only
destination-polling trace. Do not use those prefixes for shared interactions
in the unified swap/bridge view.

## Operation naming

- Use `bridge.screen.performance` for screen or view mount-to-visible timing.
- Use `bridge.data_fetch` for API-call or other data-fetch latency.
- For a new trace, first ask whether it measures a screen load or a data fetch;
  do not create a bespoke operation for every trace name.
- Do not force a genuinely hybrid flow into either shared operation. For
  example, submit-to-confirmation may use `bridge.execution`.
- For transaction-type-specific operations, keep the prefixes distinct:
  `swap.*` for swap-only work and `bridge.*` for bridge-only work. Shared
  unified-view work stays under the `bridge.*` operations above regardless of
  whether the user is swapping or bridging.

## Legacy TraceName inconsistency

The four existing names are grandfathered and must not be renamed:

- `SwapViewLoaded`, `SwapQuoteFetch`, and `SwapTokenSearch` use the legacy
  `Swap` prefix.
- `BridgeBalancesUpdated` uses the legacy `Bridge` prefix.

All four are shared unified-view spans; the `Bridge` prefix does not make
`BridgeBalancesUpdated` bridge-only. This inconsistency is deliberate legacy
continuity. `TraceName` is the literal transaction name stored by Sentry,
whereas `op` is the grouping field. Renaming a `TraceName` would split the
historical data under the old string. The panel-title convention decouples the
viewer-facing name from that raw value. New trace names should follow the
conventions in this document; these four remain unchanged.

## Example Sentry queries

```text
# All shared data-fetch spans
op:bridge.data_fetch

# All shared screen-load spans
op:bridge.screen.performance

# One exact trace
transaction:"Swap Quote Fetch"

# Combine an operation with an exact trace
op:bridge.data_fetch transaction:"Swap Token Search"

# The legacy Bridge-prefixed trace
transaction:"Bridge Balances Updated"
```

The source of truth for the names and operations is
`app/util/trace.ts`. When adding a trace, preserve an already-emitted
`TraceName`, select the operation from the screen/data-fetch/hybrid rule above,
and choose a generic panel title unless the trace is transaction-type-specific.
