# Swaps/Bridge Sentry reference

## Trace operation classification

The `TraceOperation` value is a coarse grouping key for Sentry performance
dashboards. It should classify the kind of work being measured rather than
repeat the trace name.

| Trace name                | Operation                   | Use for                                            |
| ------------------------- | --------------------------- | -------------------------------------------------- |
| `Swap View Loaded`        | `bridge.screen.performance` | Unified swap/bridge screen mount-to-visible timing |
| `Swap Quote Fetch`        | `bridge.data_fetch`         | Quote request latency                              |
| `Swap Token Search`       | `bridge.data_fetch`         | Token search request latency                       |
| `Bridge Balances Updated` | `bridge.data_fetch`         | Balance refresh latency                            |

Use `bridge.screen.performance` for shared unified-view screen or view
mount-to-visible timing. Use `bridge.data_fetch` for shared unified-view API or
data-fetch latency, such as quote, token search, and balance requests.

Do not create a new operation for every trace name. For a future trace, first
decide whether it measures screen readiness or data fetching. A hybrid
interaction such as submit-to-confirmation should use its own operation (for
example, `bridge.execution`), and transaction-type-specific traces should use
their own `swap.*` or `bridge.*` operation rather than one of these shared
values.
