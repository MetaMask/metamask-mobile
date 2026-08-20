# MUSD-1259 Earn Explore Search Design

## Summary

Add Earn as a feed-native category in Explore Search. The All filter shows an
Earn section containing the Money account row, when visible, followed by enough
Earn asset rows to fill the existing three-result section limit. The Earn
filter shows the Money account row and all query-matching eligible Earn assets.

This work builds on MUSD-1258 and reuses its Earn asset catalogue, ranking,
Money visibility, rate, and navigation authorities. It does not add an Earn tab
to the main Explore feed.

## Requirements

- Gate all Earn search content with the existing Explore Earn section feature
  flag.
- Show the Money account above Earn assets whenever Money account visibility
  rules allow it.
- Keep the Money account visible for every search query.
- In All results, show at most three Earn rows: Money plus two assets when
  Money is visible, or three assets when it is not.
- In the Earn filter, show Money plus every eligible Earn asset matching the
  query.
- Keep existing Explore Search feeds and their relative ordering unchanged.
  Insert Earn after Perps.
- Selecting View all in the Earn section activates the Earn filter.
- Opening Explore Search from either action in the existing Earn card section
  preselects the Earn filter.

## Architecture

### Feed integration

Earn is a normal `SearchFeedId` registered by `useExploreSearch`, alongside
Crypto, Perps, Stocks, Predictions, and Sites. This keeps pill generation,
section flattening, row analytics, View all behavior, and empty states inside
the existing search architecture.

The Earn feed is omitted when the existing Explore Earn feature flag is off.
If navigation requests the Earn filter while the feed is unavailable, Explore
Search selects All instead.

### Earn search feed

A new `useEarnSearchFeed` hook consumes `useEarnAssetCatalogue` once at the
search boundary. It returns:

- a discriminated list of Money and asset items;
- loading state;
- visible error information;
- an asynchronous retry callback.

The hook does not perform requests per row. It memoizes ranking, filtering, and
item construction.

The item model has two variants:

- `money-account`: Money balance, balance status, APY, and rate status;
- `asset`: a ranked Earn asset with its highest-rate experience.

### Shared Earn projection

The current section ranking utility is split into two layers:

1. `rankEarnAssets` enriches every catalogue asset with rate status,
   highest-rate percentage, and highest-rate experience, then ranks held assets
   before discovery assets.
2. `rankEarnSectionAssets` preserves the MUSD-1258 card contract by slicing the
   ranked list to five items and padding unavailable slots.

Explore Search consumes the full unpadded result. Existing homepage and Explore
card sections retain their current five-slot behavior.

Held assets remain ordered by descending fiat balance. Discovery assets remain
ordered by descending displayed rate. APR and APY percentages are not
normalized against each other, matching the existing section behavior.

### Search filtering

Asset search is case-insensitive across token name, ticker, and symbol. Ranking
is applied before filtering so matching results retain the established
held-first order.

The Money account is pinned and is not text-filtered. This matches the approved
Figma state, where a `usdc` query still includes Money. Therefore, an Earn
search with no matching assets is not empty while Money remains visible.

## UI Design

### Earn section in All results

Use the existing Explore Search `SectionHeader` pattern:

- title: `Earn`;
- title uses alternative text color;
- end action: `View all` and a right arrow;
- action selects the Earn pill and emits the existing View all tab-switch
  analytics event.

The section uses the existing three-item All-results cap. The Money account
counts toward that cap.

### Money account row

The row contains:

- existing 40 px Money logo;
- primary text `Money account`;
- existing New tag while the balance is zero;
- secondary text `Get started` while the raw fiat balance is zero;
- otherwise, formatted Money account fiat balance;
- success-colored `{percentage}% APY` on the right.

Balance and APY load independently. Their text areas render skeletons while
loading. A missing APY is never displayed as `0%`.

Tapping the row uses `navigateToMoneyHome`. Users who have not seen enabled
Money onboarding enter onboarding; all other users enter Money Home.

### Earn asset row

The row contains:

- 40 px token avatar with bottom-right network badge;
- token name as primary text;
- `${tokenAmount} ${tokenSymbol}` as secondary text;
- success-colored rate text on the right.

A held asset is defined as an asset with a numeric token balance greater than
zero. Held rows display `Get {percentage}% APY` or
`Get {percentage}% APR`. Zero-balance discovery rows display
`{percentage}% APY` or `{percentage}% APR`.

Rates use the highest-rate experience selected by the shared projection. A
missing rate displays the existing unavailable-rate copy rather than a fake
percentage.

Tapping a held row opens Earn Strategy Selection with its CAIP-19 `assetId`.
Tapping a zero-balance row opens Asset Details with
`TokenDetailsSource.ExploreEarn`.

### Earn filter

The Earn filter does not repeat the section header. It renders the pinned Money
row, when visible, then every query-matching asset row.

If Money is hidden and no assets match, the existing feed-specific empty state
is shown. Deselecting Earn returns to All and does not trigger new feed
requests.

## Loading and Error Handling

The Money row renders progressively when it is already available, using field
skeletons for balance and APY. Asset skeletons are shown only when no usable
Earn asset data is available and the catalogue is still loading.

Catalogue failure produces a visible inline warning in both the All section and
Earn filter. The warning includes Retry. Retry awaits the catalogue refresh,
prevents duplicate concurrent attempts, and surfaces a repeated failure instead
of hiding it.

Usable rows may remain visible during a partial failure, but the degraded state
must remain explicit. Errors are not converted into empty results, placeholder
rates, or zero balances.

## Navigation

Explore Search route parameters gain an optional initial pill. The parameter is
consumed once after available sections are known:

- `earn` selects Earn when the feed is enabled;
- an unavailable or invalid pill falls back to All;
- switching pills afterward remains user-controlled.

Both placeholder alert actions in the existing Earn card section navigate to
Explore Search with the Earn initial pill. Existing token navigation parameters
and Money onboarding logic remain authoritative.

## Analytics and Accessibility

Extending the typed feed ID to `earn` allows existing Explore Search events to
record:

- `tab_name: earn`;
- `section_name: earn` for All-result taps;
- `comes_from_view_all_tap: true` for View all;
- result position and result count.

Stable item identifiers are:

- `money-account` for Money;
- CAIP-19 `assetId` for Earn assets.

Rows remain accessible buttons. View all keeps a descriptive label containing
the Earn section title. The warning and Retry action receive stable test IDs and
accessible labels.

## Performance

- Mount `useEarnAssetCatalogue` once in the Earn feed hook, never in rows.
- Memoize full ranking, query filtering, and discriminated items.
- Keep row callbacks stable with `useCallback`.
- Memoize row components where stable props allow React to bail out.
- Reuse the existing single `useExploreSearch` instance so pill switches do not
  duplicate API requests.
- Avoid broadening the section hook with search-specific modes; its fixed-card
  contract remains isolated from the vertical search feed.

These constraints prevent per-row subscriptions and avoid rerendering all Earn
rows when only the active search pill changes.

## Test Design

Test changes are approved for this work. All API-backed hooks and requests must
be mocked.

### Pure utility tests

- Full ranking returns every asset without unavailable padding.
- Held assets rank before discovery assets.
- Existing five-slot slicing and padding remain unchanged.
- Highest-rate APR/APY metadata is preserved.

### Feed hook tests

- Existing feature flag controls feed registration.
- Money visibility controls the pinned Money item.
- Money remains present for nonmatching queries.
- Asset filtering matches name, ticker, and symbol.
- Ranked assets retain held-first order.
- Loading is progressive when Money or usable assets exist.
- Failure is visible and Retry awaits refresh.

### Row tests

- Zero balance shows Get started and New.
- Nonzero balance shows formatted fiat.
- Balance and rate skeletons render independently.
- Held and discovery rows use the correct APY/APR copy.
- Token avatar includes the network badge.
- Money uses onboarding-or-home navigation.
- Held assets open strategy selection.
- Zero-balance assets open Asset Details.

### Search integration tests

- Earn pill appears after Perps when enabled and is absent when disabled.
- All results show Money plus two assets when Money is visible.
- Earn filter shows Money plus all matching assets.
- View all selects Earn and emits existing analytics.
- Initial Earn routing works and safely falls back when disabled.
- Earn errors and empty states render visibly.
- Existing Explore Search behavior remains unchanged.

Use focused unit tests for pure helpers and narrow component contracts. Use the
existing Explore Search component-view suite for pill, All-results, routing,
error, and navigation behavior.

## Out of Scope

- A new main Explore feed tab.
- New Earn or Money eligibility rules.
- New rate calculations or APR-to-APY normalization.
- Changes to the catalogue's source ownership.
- New API requests from search rows.
- Appium E2E coverage.
