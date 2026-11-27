# Network dashboard in Sentry

Spec for a Sentry dashboard that answers the same questions as the local
Network Pulse dashboard (`scripts/network-inspector`), using real user traffic.

Status: the app side is implemented. The dashboard itself is not built, because
it has to be created in the Sentry org. Anything marked **verify** depends on
the Sentry product or org configuration and was not checked.

## What each tool is for

|           | Local Network Pulse              | Sentry                                           |
| --------- | -------------------------------- | ------------------------------------------------ |
| Data      | every request of one dev session | a sample of real users                           |
| Detail    | headers, bodies, JS stack, cURL  | method, endpoint, status, duration, size, screen |
| Freshness | live                             | minutes of delay                                 |
| Use it to | debug one flow now               | find what hurts users at scale                   |

They complement each other. Do not try to turn one into the other.

## Data contract

Every outgoing request becomes an `http.client` span. Sources:

| Field                                                                                        | Where it comes from                                          |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `span.op` = `http.client`, `span.duration`, `span.status`                                    | Sentry SDK (fetch and XHR instrumentation)                   |
| `http.method`, `server.address`, `http.response.status_code`, `http.response_content_length` | Sentry SDK                                                   |
| `route.name` (focused screen), `connection_type` (wifi, cellular)                            | `app/util/sentry/outgoingRequestContext.ts`, already shipped |
| `endpoint` e.g. `POST mainnet.infura.io/v3/:id`                                              | new, `networkSpanAttributes.ts`                              |
| `rpc.method` e.g. `eth_call`, `batch(3)`                                                     | new, read from the JSON-RPC body on the device               |
| `request.redundant` = `true`                                                                 | new, set when the same call repeats within 3 s on one device |

`endpoint` collapses ids, hashes, UUIDs and `0x` addresses, and drops scheme,
query and fragment. It is the field to group by. `span.description` and the url
attributes are rewritten the same way before sending.

### Privacy: what changed

The SDK records the full url, query string included, in `url`, `http.url`,
`url.full` and `http.query`, and the path can hold a wallet address or an
Infura key. `beforeSendSpan` now rewrites those attributes to the normalized
form, and drops `http.query` and `http.fragment`. Standalone request
transactions are now named `METHOD host/normalized/path` instead of the raw url.

Consequence: transaction names changed. Any alert or remote sample-rate entry
keyed on the old raw-url names stops matching. None could have matched a
specific endpoint in practice, because the old names were unique per url.

Bodies, headers and JS stacks are never sent. `rpc.method` is the only value
read from a body, and only the `method` field of a JSON-RPC payload under 64 kB.

## Before building anything: three checks

Run in Explore, Spans, over the last 24 hours.

1. Volume. `span.op:http.client`, group by `route.name`, show `count()`. Confirms
   spans arrive and shows how thin the sample is.
2. Privacy. Group by `span.description`, sort by `count()`. Scan for `0x…` and
   long hex or token segments. After the new build ships there should be none.
3. Fields. Open the field picker and confirm the exact names of the status code
   and response size attributes. Use whatever the picker shows in the queries
   below (**verify**: `http.response.status_code`, `http.response_content_length`).

## Sampling and consent

- Only users with metrics consent send anything (`enabled: hasConsent`).
- Production samples 3% of traces. `exp`, `e2e` and dev builds sample 100%.
- Remote per-name rates exist (`getRemoteTraceSampleRate`). Request transactions
  now carry normalized names, so a rate can target one endpoint. It applies only
  to standalone request transactions. Request spans inside a navigation or
  custom trace inherit the parent decision.
- Low-volume endpoints will be noisy. Read rates and percentiles, not raw counts,
  unless the org extrapolates span counts by sample rate (**verify**).

## Dashboard layout

Base filter for every widget: `span.op:http.client` plus the environment
(`environment:production`, adjust to the names from `deriveSentryEnvironment`).
Dashboard-level filters: release, `os.name`, `connection_type`.

### Row 1: headline numbers (big number)

| Widget              | Query                                   |
| ------------------- | --------------------------------------- |
| Requests per minute | `epm()`                                 |
| Failure rate        | `failure_rate()`                        |
| p95 latency         | `p95(span.duration)`                    |
| Redundant requests  | `count()` with `request.redundant:true` |
| Data received       | `sum(http.response_content_length)`     |

### Row 2: trends (line or bar)

| Widget                 | Query                                                              |
| ---------------------- | ------------------------------------------------------------------ |
| Requests over time     | `count()`, bar                                                     |
| Failure rate over time | `failure_rate()`, line                                             |
| Latency over time      | `p50(span.duration)` and `p95(span.duration)`, two lines, one axis |

### Row 3: pain points (tables, the part that drives decisions)

Each table groups by one field, shows `count()`, `failure_rate()`,
`p50(span.duration)`, `p95(span.duration)` and `sum(span.duration)` as time spent,
and sorts as noted.

| Widget              | Group by                    | Filter                             | Sort                                     |
| ------------------- | --------------------------- | ---------------------------------- | ---------------------------------------- |
| Failing endpoints   | `endpoint`                  | `!span.status:ok`                  | `count()` desc                           |
| Slowest endpoints   | `endpoint`                  | `count():>20`                      | `p95(span.duration)` desc                |
| Where the time goes | `endpoint`                  | none                               | `sum(span.duration)` desc                |
| Repeated requests   | `endpoint`                  | `request.redundant:true`           | `count()` desc                           |
| Heaviest responses  | `endpoint`                  | `has:http.response_content_length` | `max(http.response_content_length)` desc |
| Busiest screens     | `route.name`                | none                               | `count()` desc                           |
| Hosts               | `server.address`            | none                               | `count()` desc                           |
| JSON-RPC methods    | `rpc.method`                | `has:rpc.method`                   | `count()` desc                           |
| Status codes        | `http.response.status_code` | none                               | `count()` desc                           |

### Row 4: who is affected

Failure rate and p95 grouped by `os.name`, device model, `release` and
`connection_type`. This is the Sentry counterpart of the local "By device" card.

## Alerts worth adding

- Failure rate above 20% for one `endpoint` over an hour, with at least 50
  requests.
- p95 above 4 s for one `endpoint`.
- A step change in `request.redundant:true` count after a release.

## What Sentry will not show

- Live view and requests in flight.
- Headers, bodies, cURL and the JS caller. `route.name` is the closest to a
  caller. The local dashboard keeps the code-level view for dev and QA.
- Ranked advice and root-cause grouping such as "credentials rejected on 6
  endpoints". The table widgets show the same data, but the interpretation is
  manual. Sentry's own performance issue detectors (N+1 API call, consecutive
  HTTP, large HTTP payload) may cover part of it, **verify** that they run for
  React Native in this org.

## Rollout

1. Ship the attributes and the span scrubbing in an `exp` build (100% sampling).
2. Run the three checks above on that data.
3. Build the dashboard from this spec on `exp` data. Iterate on field names.
4. Ship to production. Expect thinner data (3% of consenting users).
5. Add the alerts once a week of real data shows the normal range.

## Implementation map

- `app/util/sentry/networkSpanAttributes.ts`: normalization, JSON-RPC method,
  redundancy tracker, `scrubOutgoingRequestSpan`. Pure, unit tested.
- `app/util/sentry/outgoingRequestContext.ts`: `annotateNetworkRequestSpan` sets
  the three attributes in the `beforeOutgoingRequestSpan` hook, and the
  standalone request transaction uses the normalized name.
- `app/util/sentry/utils.ts`: `beforeSendSpan` runs the scrubber.
