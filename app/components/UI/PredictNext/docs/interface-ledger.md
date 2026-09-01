# PredictNext Interface Ledger

This ledger records the implemented mobile canonical read contract stabilized by PRED-1168 and refined by PRED-1169. Venue DTO mapping belongs to the Predict API backend; mobile validates canonical Predict API responses only.

The agreed next-contract direction is documented in [`canonical-read-model-and-api.md`](./canonical-read-model-and-api.md). It is not executable until the types, runtime parsers, transport, service, fixtures, and tests are updated together.

## Canonical read models

- `PredictFeed` is returned by `getFeed` and contains the Feed identity, title, Events, and optional pagination cursor.
- `PredictEvent` is returned within a Feed and by `getEvent`, and contains one or more `PredictMarket` values.
- Feed pagination uses `{ venueId, id, title, events, nextCursor? }`; cursors are opaque.
- `PredictMarket` contains exactly two `PredictOutcome` values: one `yes` and one `no`.
- `PredictMarket.group` is optional backend-owned presentation metadata. Mobile supports `marketSelector` groups with a key, Market type, numeric option, and optional display order. Unknown group types remain standard Markets, and mobile never derives group values.
- Each Event, Market, and Outcome retains its own opaque ID. Only the root Event carries `venueId`; nested scope and parent relationships come from containment.
- Each Outcome may contain independent `askPrice` and `bidPrice` decimal strings in the inclusive range `[0, 1]`. Missing means no current quote, not zero.
- Event responses provide the initial Bid Price and Ask Price snapshot. Market history is read separately with `venueId + marketId + range`; it returns the last traded Yes probability observed by the backend and its exact complementary No probability.
- Market status is a small browse projection, not a lossless Venue lifecycle.
- Event status is intentionally absent.
- `PredictVenueStatus` contains the root `venueId`, an `available | degraded | unavailable` status, and the backend observation time as `PredictTimestamp`.
- `PredictEntityId` is venue-local and opaque. An Outcome ID may be native or adapter-derived.
- `PredictTimestamp` is an RFC 3339/ISO-8601 UTC string.

## Agreed next-contract changes

The next public-read contract will use `Feed → Event → Market → Outcome`, with the same complete Event shape in Feed and detail responses. It will add an optional single Category and Series to Event; optional Event and Market Volume, 24-Hour Volume, and image URL; optional Sport, Competition, Game, Team, Game status, and Game Selection metadata; product-owned Feed reads; and a current-Event read for Rolling Series. Every Event has one parent Venue Event. An immutable Game detail read may append validated Markets from authoritative sibling Venue Events without changing that parent identity.

The reduced browse status will be replaced by the Kalshi lifecycle vocabulary: `initialized`, `active`, `inactive`, `closed`, `determined`, `disputed`, `amended`, and `finalized`. The existing binary Outcome invariant remains unchanged: Game Selection complements rather than replaces an Outcome's `yes | no` side.

## Query descriptors

```ts
marketDataQueries.getVenueStatus(venueId);
marketDataQueries.getFeed(venueId, feedId, params);
marketDataQueries.getEvent(venueId, eventId);
marketDataQueries.getMarketHistory(venueId, marketId, range);
```

All descriptors have Venue-qualified keys, semantic invalidation families, explicit `venue` scope, and centralized stale-time policy. Market-history identity is additionally Market-qualified, while range is part of the exact query key and omitted from its invalidation family. The first price-bearing Event list/detail, Market history, and Venue Status policy is one minute, with no background polling.

## Runtime boundary

Mobile parsers in `contracts/v1/marketData.ts` validate canonical Predict API responses using `@metamask/superstruct`. Parsers discard unknown fields, reject malformed known fields, and return generic errors that do not retain received payload values. Kalshi and Polymarket DTOs, status mapping, price-field mapping, and identifier derivation are backend adapter responsibilities and must not enter this module. Contract-version header enforcement and cross-repository fixture tooling are deferred.

## Testing boundary

Contract tests should validate canonical response parsing, binary outcome invariants, decimal price bounds, one-sided or missing quotes, recursive removal of unknown fields, malformed known fields failing closed, the complete pagination envelope, Venue Status, and descriptor behavior. Duplicate-ID validation is intentionally left to the backend. Adapter mapping and service/controller integration tests belong to their respective delivery slices.
