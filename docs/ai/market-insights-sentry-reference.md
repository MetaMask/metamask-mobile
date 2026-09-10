# Market Insights Sentry Performance

Sentry duration telemetry for the Market Insights entry cards and full report
view. Product analytics events are separate and must not be used as duration
boundaries.

## Measurement model

Fetch duration and time to content are separate spans. A cold time-to-content
span normally overlaps a fetch span. A warm time-to-content span can complete
without a fetch because React Query already has a report.

Do not subtract aggregate fetch percentiles from aggregate time-to-content
percentiles. The populations differ because cache hits do not emit fetch spans.

| Span description                    | Operation                           | Start                                                         | Successful end                      |
| ----------------------------------- | ----------------------------------- | ------------------------------------------------------------- | ----------------------------------- |
| `Market Insights Fetch`             | `market_insights.fetch`             | Immediately before `AiDigestController.fetchMarketInsights()` | Controller promise resolves         |
| `Market Insights Entry Card Load`   | `market_insights.load`              | Token or Perps entry-card generation begins                   | Report card commits                 |
| `Market Insights View Load`         | `market_insights.load`              | User presses an entry card                                    | Matching full report commits        |
| `Market Insights Viewport Tracking` | `market_insights.viewport_tracking` | Entry card lays out                                           | At least 50% of the card is visible |

Entry-card and full-view spans also terminate for valid empty responses, errors,
and owner cancellation. Empty and error closes wait until the current observer
settles: a cached `null` miss or error is immediately stale and refetches on
remount, so that remount must not close before the refetch completes. A later
focus refetch of an already-settled result must not flip loading or reopen the
entry-card skeleton. Latency widgets must use `result:success`; reliability
widgets count every result.

## Attributes

All attributes are bounded and safe for dashboard grouping.

| Attribute       | Values                                   | Notes                                                      |
| --------------- | ---------------------------------------- | ---------------------------------------------------------- |
| `feature`       | `market_insights`                        | Common dashboard filter                                    |
| `source`        | `token_details`, `perps`, `unknown`      | `unknown` is reserved for entry routes without attribution |
| `stage`         | `entry_card`, `full_view`                | Journey phase                                              |
| `asset_type`    | `token`, `perps`                         | Present on fetch and time-to-content spans                 |
| `cache_state`   | `cold`, `warm`                           | Cache state when the query generation began                |
| `result`        | `success`, `empty`, `error`, `cancelled` | Terminal outcome                                           |
| `success`       | `true`, `false`                          | `empty` is a valid successful resolution                   |
| `content_state` | `filled`, `empty`, `error`               | Omitted for cancellation                                   |
| `reason`        | `owner_cancelled`                        | Present for cancellation                                   |
| `measure_calls` | positive integer                         | Viewport polling diagnostic                                |
| `resolved_by`   | `visibility_threshold`, `unmount`        | Viewport terminal boundary                                 |

Asset identifiers and digest IDs are intentionally not tags because they are
high-cardinality values.

## Dashboard queries

Use the spans dataset. Keep the dashboard environment filter unset by default so
all environments are included. Add dashboard filters for `environment`,
`platform`, `release`, `source`, `stage`, and `cache_state`.

### Latency

Use `p50(span.duration)`, `p75(span.duration)`, `p95(span.duration)`, and
`count()`:

```text
span.description:"Market Insights Fetch" result:success
```

```text
span.description:"Market Insights Entry Card Load" result:success
```

```text
span.description:"Market Insights View Load" result:success
```

Split time-series widgets by `source`. The entry-card widget compares Token
Details and Perps. The full-view widget compares the same sources from the user
press boundary.

### Reliability and cache behavior

```text
span.op:[market_insights.fetch,market_insights.load] result:[empty,error,cancelled]
```

Group by `span.description`, `result`, and `source`.

Compare TTC counts grouped by `cache_state` with fetch counts. A warm TTC with no
matching fetch is expected and represents a cache hit, not missing telemetry.

### Viewport diagnostics

```text
span.description:"Market Insights Viewport Tracking"
```

Chart `p50(span.duration)`, `p95(span.duration)`, and `avg(measure_calls)`.
Group cancellation rows by `resolved_by` and `source`.

## Recommended dashboard layout

1. **Journey health:** event volume, p50/p75/p95 fetch, entry-card TTC,
   full-view TTC, and error/cancellation counts.
2. **Duration trends:** one time series per authoritative span, split by source.
3. **Cache and outcomes:** TTC grouped by cache state; outcomes grouped by
   result and source.
4. **Diagnostics:** viewport duration and measure calls, followed by a table of
   slow or unsuccessful spans.

Dashboard latency values are release-pending until an identifiable mobile
release emits the new attributes. Missing pre-adoption data is not a zero.

## Dashboard build sheet

Create the dashboard in organization `metamask`, project `metamask-mobile` with
the title **Mobile — Social & AI — Market Insights**. Use the spans dataset for
every widget, a default period of 14 days, and no default environment
restriction.

| Widget                     | Visualization | Query                                                                                                                                             | Fields / grouping                                                                                                                    |
| -------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Journey latency            | Table         | `feature:market_insights result:success span.description:["Market Insights Fetch","Market Insights Entry Card Load","Market Insights View Load"]` | Group by `span.description`, `source`; show `p50(span.duration)`, `p75(span.duration)`, `p95(span.duration)`, `count()`              |
| Fetch duration             | Time series   | `span.description:"Market Insights Fetch" result:success`                                                                                         | `p50(span.duration)`, `p75(span.duration)`, `p95(span.duration)`; group by `source`                                                  |
| Entry-card TTC             | Time series   | `span.description:"Market Insights Entry Card Load" result:success`                                                                               | `p50(span.duration)`, `p75(span.duration)`, `p95(span.duration)`; group by `source`                                                  |
| Full-view TTC              | Time series   | `span.description:"Market Insights View Load" result:success`                                                                                     | `p50(span.duration)`, `p75(span.duration)`, `p95(span.duration)`; group by `source`                                                  |
| Journey outcomes           | Table         | `feature:market_insights span.op:[market_insights.fetch,market_insights.load]`                                                                    | Group by `span.description`, `result`, `source`; show `count()`                                                                      |
| Cache behavior             | Table         | `span.op:market_insights.load`                                                                                                                    | Group by `span.description`, `cache_state`, `source`; show `count()`, `p75(span.duration)`, `p95(span.duration)`                     |
| Viewport diagnostics       | Table         | `span.description:"Market Insights Viewport Tracking"`                                                                                            | Group by `source`, `resolved_by`; show `count()`, `p50(span.duration)`, `p95(span.duration)`, `avg(measure_calls)`                   |
| Slow or unsuccessful spans | Table         | `feature:market_insights (success:false OR span.duration:>2000)`                                                                                  | Show `timestamp`, `span.description`, `span.duration`, `source`, `stage`, `cache_state`, `result`, `release`, `environment`, `trace` |

Add dashboard filters for:

```text
environment
platform
release
source
stage
cache_state
```

The dashboard described above is live at
[Mobile — Social & AI — Market Insights](https://metamask.sentry.io/dashboard/9977958/).
Keep this build sheet in sync when widgets change. Before the new release is
available, the existing spans can be inspected through the
[validated 30-day baseline query](https://metamask.sentry.io/explore/traces/?query=span.description%3A%5B%22Market+Insights+Entry+Card+Load%22%2C%22Market+Insights+View+Load%22%2C%22Market+Insights+Viewport+Tracking%22%5D&project=2299799&aggregateField=%7B%22groupBy%22%3A%22span.description%22%7D&aggregateField=%7B%22yAxes%22%3A%5B%22p50%28span.duration%29%22%2C%22p75%28span.duration%29%22%2C%22p95%28span.duration%29%22%2C%22count%28%29%22%5D%7D&mode=aggregate&sort=-count%28%29&statsPeriod=30d&table=span).

Current baseline values (30 days, captured 2026-09-07):

| Span              |      Count |    p50 |      p75 |        p95 |
| ----------------- | ---------: | -----: | -------: | ---------: |
| Entry Card Load   |  5,913,072 | 626 ms | 1,199 ms |   4,272 ms |
| View Load         |     67,633 | 121 ms |   311 ms |   1,109 ms |
| Viewport Tracking | 18,655,813 |  45 ms |   231 ms | 300,720 ms |

The legacy viewport p95 includes unresolved/unmount lifetimes. After adoption,
the viewport latency widget must filter `result:success`; cancellation volume
belongs in the outcomes widget.
