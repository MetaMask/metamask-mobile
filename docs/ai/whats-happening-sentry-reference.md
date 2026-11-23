# What's Happening Sentry Performance

Sentry duration telemetry for the What's Happening carousel and expanded
detail view. Product analytics events are separate and must not be used as
duration boundaries. Viewport tracking is not measured for this feature.

## Measurement model

Fetch duration and time to content are separate spans. A cold time-to-content
span normally overlaps a fetch span. A warm time-to-content span can complete
without a fetch because React Query already has a market overview.

Do not subtract aggregate fetch percentiles from aggregate time-to-content
percentiles. The populations differ because cache hits do not emit fetch spans.

| Span description                    | Operation               | Start                                                         | Successful end              |
| ----------------------------------- | ----------------------- | ------------------------------------------------------------- | --------------------------- |
| `What's Happening Fetch`            | `whats_happening.fetch` | Immediately before `AiDigestController.fetchMarketOverview()` | Controller promise resolves |
| `What's Happening Front Page Fetch` | `whats_happening.fetch` | Immediately before `fetchFrontPageItem()` (deeplink only)     | Promise resolves            |
| `What's Happening Carousel Load`    | `whats_happening.load`  | Feed observer starts (`useWhatsHappening` + source)           | First carousel card commits |
| `What's Happening View Load`        | `whats_happening.load`  | User presses a card/header, or detail mounts from deeplink    | First expanded card commits |

Carousel and expanded spans also terminate for valid empty responses, errors,
and owner cancellation. Empty and error closes wait until the current observer
settles: a cached `null` miss or error is immediately stale and refetches on
remount, so that remount must not close before the refetch completes. A later
focus refetch of an already-settled result must not flip UI loading or reopen
carousel skeletons. Latency widgets must use `result:success`; reliability
widgets count every result.

Explore and Perps hide the section until `isWhatsHappeningSectionVisible`. A
settled empty miss never mounts the section. Carousel TTC therefore starts in
`useWhatsHappening` (which knows the query) and ends as `empty` from the hook
when the generation settles with no items and no error.

What's Happening cards reuse Market Insights viewport visibility for MetaMetrics
`WHATS_HAPPENING_CARD_SCROLLED_TO_VIEW` only. They must not emit Market Insights
or What's Happening viewport Sentry spans.

## Attributes

All attributes are bounded and safe for dashboard grouping.

| Attribute       | Values                                                | Notes                                                                |
| --------------- | ----------------------------------------------------- | -------------------------------------------------------------------- |
| `feature`       | `whats_happening`                                     | Common dashboard filter                                              |
| `source`        | `homepage`, `explore`, `perps`, `deeplink`, `unknown` | Per-observer TTC and front-page fetch only. Overview fetch omits it. |
| `stage`         | `carousel`, `expanded`                                | Per-observer TTC and front-page fetch only. Overview fetch omits it. |
| `cache_state`   | `cold`, `warm`                                        | Cache state when the query generation began                          |
| `fetch_kind`    | `overview`, `front_page`                              | Present on fetch spans only                                          |
| `result`        | `success`, `empty`, `error`, `cancelled`              | Terminal outcome                                                     |
| `success`       | `true`, `false`                                       | `empty` is a valid successful resolution                             |
| `content_state` | `filled`, `empty`, `error`                            | Omitted for cancellation                                             |
| `reason`        | `owner_cancelled`                                     | Present for cancellation                                             |

Item titles and front-page IDs are intentionally not tags because they are
high-cardinality values. Trace ids are `${source}:${stage}`.

## Dashboard queries

Use the spans dataset. Keep the dashboard environment filter unset by default so
all environments are included. Add dashboard filters for `environment`,
`platform`, `release`, `source`, `stage`, and `cache_state`.

### Latency

Use `p50(span.duration)`, `p75(span.duration)`, `p95(span.duration)`, and
`count()`:

```text
span.description:"What's Happening Fetch" result:success
```

```text
span.description:"What's Happening Carousel Load" result:success
```

```text
span.description:"What's Happening View Load" result:success
```

Split TTC time-series widgets by `source`. The carousel widget compares Explore
and Perps. The full-view widget compares the same sources plus deeplink from the
press or navigate boundary. Do not group overview fetch by `source`: one shared
React Query generation serves every observer, so the mount that ran `queryFn`
is not a meaningful caller.

### Reliability and cache behavior

```text
span.op:[whats_happening.fetch,whats_happening.load] result:[empty,error,cancelled]
```

Group by `span.description`, `result`, and `source`.

Compare TTC counts grouped by `cache_state` with overview fetch counts. Do not
join those series on `source`. A warm TTC with no matching fetch is a cache
hit. Two cold TTC rows (Explore and Perps) against one unattributed overview
fetch is the shared request, not missing telemetry.

## Recommended dashboard layout

1. **Journey health:** event volume, p50/p75/p95 fetch, carousel TTC,
   full-view TTC, and error/cancellation counts.
2. **Duration trends:** one time series per authoritative span, split by source.
3. **Cache and outcomes:** TTC grouped by cache state; outcomes grouped by
   result and source.
4. **Diagnostics:** a table of slow or unsuccessful spans.

Dashboard latency values are release-pending until an identifiable mobile
release emits the new attributes. Missing pre-adoption data is not a zero.

## Dashboard build sheet

Create the dashboard in organization `metamask`, project `metamask-mobile` with
the title **Mobile — Social & AI — What's Happening**. Use the spans dataset for
every widget, a default period of 14 days, and no default environment
restriction.

| Widget                     | Visualization | Query                                                                                                                                              | Fields / grouping                                                                                                                    |
| -------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Journey latency            | Table         | `feature:whats_happening result:success span.description:["What's Happening Fetch","What's Happening Carousel Load","What's Happening View Load"]` | Group by `span.description`, `source`; show `p50(span.duration)`, `p75(span.duration)`, `p95(span.duration)`, `count()`              |
| Fetch duration             | Time series   | `span.description:"What's Happening Fetch" result:success`                                                                                         | `p50(span.duration)`, `p75(span.duration)`, `p95(span.duration)`; group by `cache_state`                                             |
| Carousel TTC               | Time series   | `span.description:"What's Happening Carousel Load" result:success`                                                                                 | `p50(span.duration)`, `p75(span.duration)`, `p95(span.duration)`; group by `source`                                                  |
| Full-view TTC              | Time series   | `span.description:"What's Happening View Load" result:success`                                                                                     | `p50(span.duration)`, `p75(span.duration)`, `p95(span.duration)`; group by `source`                                                  |
| Journey outcomes           | Table         | `feature:whats_happening span.op:[whats_happening.fetch,whats_happening.load]`                                                                     | Group by `span.description`, `result`, `source`; show `count()`                                                                      |
| Cache behavior             | Table         | `span.op:whats_happening.load`                                                                                                                     | Group by `span.description`, `cache_state`, `source`; show `count()`, `p75(span.duration)`, `p95(span.duration)`                     |
| Slow or unsuccessful spans | Table         | `feature:whats_happening (success:false OR span.duration:>2000)`                                                                                   | Show `timestamp`, `span.description`, `span.duration`, `source`, `stage`, `cache_state`, `result`, `release`, `environment`, `trace` |

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
[Mobile — Social & AI — What's Happening](https://metamask.sentry.io/dashboard/9989431/).
Keep this build sheet in sync when widgets change. Widgets will stay empty
until a mobile release emits the What's Happening spans.
