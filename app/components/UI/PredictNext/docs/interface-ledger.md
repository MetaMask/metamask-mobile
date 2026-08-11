# PredictNext Interface Ledger

This ledger records the mobile canonical read contract stabilized by PRED-1168 and refined by PRED-1169. Venue DTO mapping belongs to the Predict API backend; mobile validates canonical Predict API responses only.

## Canonical read models

- `PredictEvent` is returned by both `getEvents` and `getEvent` and contains one or more `PredictMarket` values.
- Event list pagination uses `{ items, nextCursor? }`; cursors are opaque.
- `PredictMarket` contains exactly two `PredictOutcome` values: one `yes` and one `no`.
- Each Event, Market, and Outcome retains its own opaque ID. Only the root Event carries `venueId`; nested scope and parent relationships come from containment.
- Each Outcome may contain independent `askPrice` and `bidPrice` decimal strings in the inclusive range `[0, 1]`. Missing means no current quote, not zero.
- Event responses provide the initial price snapshot. A separate price read is not part of this slice; future Live Updates may patch cached Outcomes.
- Market status is a small browse projection, not a lossless Venue lifecycle.
- Event status is intentionally absent.
- `PredictVenueStatus` contains the root `venueId`, an `available | degraded | unavailable` status, and the backend observation time as `PredictTimestamp`.
- `PredictEntityId` is venue-local and opaque. An Outcome ID may be native or adapter-derived.
- `PredictTimestamp` is an RFC 3339/ISO-8601 UTC string.

## Query descriptors

```ts
marketDataQueries.getVenueStatus(venueId);
marketDataQueries.getEvents(venueId, params);
marketDataQueries.getEvent(venueId, eventId);
```

All descriptors have Venue-qualified keys, semantic invalidation families, explicit `venue` scope, and centralized stale-time policy. The first price-bearing Event list/detail and Venue Status policy is one minute, with no background polling.

## Runtime boundary

Mobile parsers in `contracts/v1/marketData.ts` validate canonical Predict API responses using `@metamask/superstruct`. Parsers discard unknown fields, reject malformed known fields, and return generic errors that do not retain received payload values. Kalshi and Polymarket DTOs, status mapping, price-field mapping, and identifier derivation are backend adapter responsibilities and must not enter this module. Contract-version header enforcement and cross-repository fixture tooling are deferred.

## Testing boundary

Contract tests should validate canonical response parsing, binary outcome invariants, decimal price bounds, one-sided or missing quotes, recursive removal of unknown fields, malformed known fields failing closed, the complete pagination envelope, Venue Status, and descriptor behavior. Duplicate-ID validation is intentionally left to the backend. Adapter mapping and service/controller integration tests belong to their respective delivery slices.
