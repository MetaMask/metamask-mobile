# PredictNext Interface Ledger

This ledger records the mobile canonical read contract stabilized by PRED-1168. Venue DTO mapping belongs to the Predict API backend; mobile validates canonical Predict API responses only.

## Canonical read models

- `PredictEventSummary` is returned by `getEvents`.
- `PredictEvent` is returned by `getEvent` and contains one or more `PredictMarket` values.
- `PredictMarket` contains exactly two `PredictOutcome` values: one `yes` and one `no`.
- Market status is a small browse projection, not a lossless Venue lifecycle.
- Event status is intentionally absent.
- Prices and order-book data are separate volatile read models and are not included here.
- `PredictEntityId` is venue-local and opaque. An Outcome ID may be native or adapter-derived.
- `PredictTimestamp` is an RFC 3339/ISO-8601 UTC string.

## Query descriptors

```ts
marketDataQueries.getEvents(venueId, params);
marketDataQueries.getEvent(venueId, eventId);
```

Both descriptors have Venue-qualified keys, semantic invalidation families, explicit `venue` scope, and centralized stale-time policy. Cursors are opaque.

## Runtime boundary

Mobile parsers validate canonical Predict API responses using `@metamask/superstruct`. Kalshi and Polymarket DTOs, status mapping, and identifier derivation are backend adapter responsibilities and must not enter this module.

## Testing boundary

Contract tests should validate canonical response parsing, binary outcome invariants, malformed responses failing closed, and descriptor behavior. Adapter mapping and service/controller integration tests belong to their respective delivery slices.
