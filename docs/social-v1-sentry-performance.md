# Social V1 Sentry performance

Social V1 records data-fetch and first-content spans only for the active
`socialAiTSA1122AbtestSocialBundleV1` treatment. Attributes are bounded and
contain no addresses, usernames, profile/post/position/transaction identifiers,
entered text, route parameters, raw errors, or API payloads.

## Measurement contract

- `Social Tab Time To Content` / `social.performance` starts when a tab first
  becomes active in a focused mounted Social V1 screen. It ends after the first
  committed `content`, `empty`, or `error` state.
- Each tab emits at most one first-content span per Social V1 screen mount.
  Refresh, pagination, filters, sorting, token selection, and revisits do not
  restart it.
- An unfinished first-content span ends unsuccessfully on tab/screen focus
  loss, treatment disablement, or unmount.
- `Social Tab Data Fetch` / `social.data_fetch` wraps only the first real
  initial-page request for Trending, Following, and Leaderboard. It excludes
  refresh, pagination, filters, retries, and cache waiting.
- Live Trades is fixture-backed and emits no data-fetch span. Its first-content
  span remains cold because no usable query data exists at activation.
- `cache_state:cold` means no usable query data existed when measurement
  started; `cache_state:warm` means usable query data already existed. A fresh
  warm cache that causes no request emits no fabricated data-fetch span.

## Reproducible Sentry views

Use the Sentry spans dataset for the `metamask-mobile` project. Show
`p50(span.duration)`, `p75(span.duration)`, and `count()`.

First content:

```text
span.op:social.performance feature:social_v1
```

Group by `tab`, `cache_state`, `content_state`, `hardware_tier`, and
`network_tier`.

Data fetch:

```text
span.op:social.data_fetch feature:social_v1
```

Group by `tab`, `cache_state`, and `success`.

The emitted field names above are the contract. Confirm the corresponding
project field aliases in Sentry before saving a dashboard; do not rename mobile
attributes to match an unverified alias.
