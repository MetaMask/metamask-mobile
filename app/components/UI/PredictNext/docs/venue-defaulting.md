# Venue Defaulting Mechanism

Status: PRED-1210 spike conclusion, 2026-08-12.

## Target decision

Venue defaulting is a client-side UX decision. It uses the shared
`GeolocationController` result within the Venue rollout allowed by the remote
`predictConfig`. It does not use Venue Status as a geolocation or eligibility
source.

When both Venues are selectable and there is no valid Venue Selection
Preference:

- a known United States location defaults the Active Venue to Kalshi;
- a known non-US location defaults the Active Venue to Polymarket;
- an unknown, loading, or failed location falls back to Polymarket rather than
  assuming US eligibility.

An enabled Venue Selection Preference takes precedence over regional
defaulting only while the selected Venue remains enabled by `predictConfig`.
Legacy feed/search parameters, specific child routes, and market-specific
Predict deep links continue to resolve to Polymarket during the two-stack
transition. Generic Predict entries, including bare Predict deep links, use the
resolved Active Venue.

## Geolocation source and US rule

Mobile initializes `@metamask/geolocation-controller` at Engine startup and
eagerly calls `getGeolocation()` when the initial location is `UNKNOWN`. The
controller calls API Platform's `GET /v2/geolocation` endpoint without device
coordinates or a client-supplied country. The service returns validated
`country`, `region`, and `timezone` fields and derives a location code:

- US and Canada include a known subdivision, for example `US-CA` or `CA-ON`;
- other known countries use the country code, for example `FR`;
- an unresolved country produces `UNKNOWN`.

The package exposes `getGeolocation()`, `getGeolocationData()`, and
`refreshGeolocation()` plus the `idle | loading | complete | error` lifecycle.
Known or partially known results have a five-minute in-memory cache with
concurrent-request deduplication; a fully unknown result is not cached.
Controller fields are non-persistent, so a normal app start begins with
`UNKNOWN` and performs a best-effort lookup. A failed lookup keeps the last
known location, if any.

Use the existing `isUsaGeolocationLocation` utility for the regional rule. It
normalizes case and compares only the leading country segment:

```text
location?.toUpperCase().split('-')[0] === 'US'
```

Consequently `US`, `US-CA`, and `us-ny` are US; `GB`, `UNKNOWN`, an empty
value, and a missing value are not. Resolution should observe geolocation
status so startup `UNKNOWN` is treated as an unresolved safe fallback rather
than evidence that the user is outside the US.

Relevant implementation:

- `app/core/Engine/controllers/geolocation-api-service-init.ts`
- `app/core/Engine/controllers/geolocation-controller/index.ts`
- `app/selectors/geolocationController/index.ts`
- `app/util/region/isUsaGeolocationLocation.ts`
- [`@metamask/geolocation-controller` v1 source](https://github.com/MetaMask/core/tree/492e4c3179e55ea5c7d3e60e764e7336156f6fb4/packages/geolocation-controller/src)

## Rollout, availability, and eligibility

These inputs have separate authority:

| Concern                            | Source                                                 | Role in the target mechanism                                                                                                         |
| :--------------------------------- | :----------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------- |
| Regional UX default                | `GeolocationController`                                | Chooses Kalshi for a known US location and Polymarket otherwise when both are selectable.                                            |
| Product and Venue rollout          | Remote `predictConfig`                                 | Determines which Venues may participate in generic lane resolution and whether Venue selection is exposed.                           |
| Venue availability                 | `GET /v1/venues/{venueId}/status`                      | Reports `available`, `degraded`, or `unavailable` for an already selected Venue. It is not a country or user-eligibility response.   |
| User eligibility and authorization | Venue-specific policy and the MetaMask Predict backend | Must govern account-changing actions independently of the client default; geolocation and remote config are not authorization proof. |

Current code implements only part of that target. `predictConfig.enabled` and
the two per-Venue `enabled` values feed the temporary lane resolver, but
`venueSelection.enabled` is parsed and not yet used. There is no Venue
Selection Preference state. The temporary resolver chooses Kalshi only when
PredictNext is enabled and Kalshi is the sole enabled Venue; all other generic
entries fall back to Polymarket. Legacy-specific routes remain on Polymarket
regardless of the per-Venue values.

There is no shared Predict eligibility endpoint or policy document consumed by
the lane resolver today. In particular, the Venue Status response contains
only `venueId`, `status`, and `checkedAt`; the Kalshi UI requests it after the
Kalshi stack is mounted. It therefore cannot source regional defaulting or
prove that a Predict User may trade.

Legacy Polymarket eligibility remains a separate Venue-specific mechanism. The
legacy provider calls `https://polymarket.com/api/geoblock`, then applies the
mobile deny-list for `DE`, `RO`, `ES`, and `IN`. That result guards actions in
the Polymarket lane; it is not an input to selecting Kalshi versus Polymarket.
PredictNext does not yet expose a Kalshi user-eligibility contract. Future
account work should surface that through Account Readiness and require the
backend to authorize account-changing operations independently. PredictNext is
currently read-only, so this backend eligibility boundary is a requirement,
not an implemented mobile contract.

## Integration point

The shared lane boundary is `app/components/UI/Predict/root/PredictRoot.tsx`.
Today it passes only `predictConfig` and route parameters to
`resolvePredictRootLane`, whose temporary behavior chooses Kalshi only when it
is the sole enabled Venue. The production integration should add the
geolocation-derived regional default and, when implemented, a persisted Venue
Selection Preference at this boundary. It should not put either concern into
the Kalshi adapter, Polymarket controller, or Venue Status query.

The precedence at the lane boundary is:

1. Preserve a legacy-specific route on Polymarket.
2. Apply global and per-Venue `predictConfig` rollout controls.
3. Use a valid, enabled Venue Selection Preference when selection is enabled.
4. Otherwise use the known-US regional default.
5. Fall back to Polymarket for unresolved geolocation or an invalid
   configuration.

Venue eligibility or availability changes should render the appropriate state
inside the selected lane rather than silently rewriting the user's persisted
preference. When protected PredictNext actions are added, backend enforcement
must be authoritative.
