# Active Venue and availability

PRED-1377. One resolver, `selectActiveVenue`, decides the Active Venue. Every public API, the root `Predict` route, the legacy market-list route and `selectPredictAvailability` read it, so data, visibility and navigation agree. The resolver picks a Venue. `implementation/venueImplementations.ts` maps that Venue to the code that serves it (`polymarket → legacy`, `kalshi → next` until PRED-1356). The `next` branch receives its Venue through `useNextVenueId` and never branches on a Venue id.

## Resolution order

`resolveActiveVenue` (pure) applies these steps in order:

1. **Rollout.** Only Venues enabled in `predictConfig` are candidates. With `predictConfig.enabled: false`, or no Venue enabled, the legacy lane serves Predict (`source: 'legacyLane'`). If exactly one Venue is a candidate, it wins (`'rollout'`), and nothing waits for geolocation.
2. **Venue Selection Preference.** A stored preference wins (`'preference'`) while it names a candidate and `predictConfig.venueSelection.enabled` is true. If either condition fails, the preference is ignored, kept as stored, and reported in the result as `ignoredPreference` (`venueNotEnabled` or `venueSelectionDisabled`). `PredictVenueController` logs it once per distinct case, so a stale preference can be diagnosed.
3. **Known geolocation.** A US location defaults to Kalshi. Any other known location defaults to Polymarket (`'geolocation'`).
4. **Geolocation loading.** The result is `{ status: 'resolving' }`, for at most `ACTIVE_VENUE_GEOLOCATION_WAIT_MS` (3 s, inside the Home skeleton's budget).
5. **Geolocation failed, unknown or timed out.** The Active Venue the previous session ended on applies (`'lastActiveVenue'`), or Polymarket if none was recorded (`'fallback'`).

Steps 3 to 5 decide the **session default**. `PredictVenueController` latches it once per app session from `GeolocationController` state. The controller reads the state that the Engine-start fetch produces and never fetches a location itself. A location that arrives after the fallback has been applied takes effect in the next session. Within a session, the Active Venue changes only when the preference or the rollout config changes.

## Persistence

`PredictVenueController` (Engine, device scope) persists only Venue ids:

| Field                      | Persisted | Meaning                                                    |
| -------------------------- | --------- | ---------------------------------------------------------- |
| `venueSelectionPreference` | yes       | The Predict User's explicit choice; `null` means automatic |
| `lastActiveVenue`          | yes       | The Active Venue most recently resolved on this device     |
| `sessionDefault`           | no        | This session's latched default and its source              |

The controller does not store the location or any other PII. On hydration it drops Venue ids that this build does not know. Its init subscribes to the Redux store and records every Active Venue that `selectActiveVenue` resolves. The record is kept whether or not a Predict screen is open. `Engine.resetState` calls `clearState()`, which clears the preference and the history (consistent with PRED-1381). A session default that came from geolocation is device context, so it stays. A session default taken from the cleared history becomes the no-history fallback.

## Flag semantics during the transition

| Flag                                         | Meaning                                                                                                                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `predictConfig.enabled`                      | Chooses between lanes. `false` means the legacy Polymarket lane. It is **not** a kill switch: Predict stays available under `predictTradingEnabled`. This is the production default. |
| `predictConfig.venues.<venue>.enabled`       | Per-Venue rollout and that Venue's kill switch. Turning a Venue off removes it from the candidates, so its users resolve to another Venue and are not hidden.                        |
| `predictConfig.venueSelection.enabled`       | Whether a Venue Selection Preference is honored (and whether B2's picker shows). Turning it off ignores stored preferences without deleting them.                                    |
| `predictTradingEnabled`                      | Availability of the **legacy lane**. It is version-gated and defaults to `true` when absent or invalid. It does not gate a `next` Venue.                                             |
| `selectPredictEnabledFlag` (legacy selector) | Reads `predictTradingEnabled`. Legacy code keeps using it. External gates move to `selectPredictAvailability` in D1 (PRED-1392).                                                     |

`selectPredictAvailability` and `usePredictAvailability()` live in `availability/`. They are venue-aware:

- While Polymarket (legacy) is active, availability equals `selectPredictEnabledFlag`. A test holds this invariant.
- While a `next` Venue is active, it is available. Its rollout flag is its kill switch and has already made it a candidate.
- While the Active Venue is `resolving`, availability is true only if every candidate is available. An entry point therefore never appears and then disappears.

To hide Predict for every user, turn off `predictTradingEnabled` and also either set `predictConfig.enabled: false` or disable every `next` Venue.

Availability is the only one of these projections that `selectPredictAvailability` answers:

- Account Readiness and eligibility gate actions, not public browsing.
- Venue Status (`useVenueStatus`) covers degraded cached browsing.
- Venue Capabilities (`useVenueCapabilities`) cover feature support.

None of the three is folded into availability.

## Consumers

- `selectActiveVenue` / `useActiveVenue()` return `{ status: 'resolving' }`, or `{ status: 'ready', venue, source, ignoredPreference? }`.
- `selectVenueSelectionPreference` returns the stored preference, honored or not.
- `selectSelectableVenues` returns the Venues a preference may name. It is empty unless venue selection is enabled and more than one Venue is rolled out.
- `PredictVenueController:setVenueSelectionPreference(venue | null)` (messenger action, or `Engine.context.PredictVenueController`) stores a choice; `null` returns to automatic.
- `PredictVenueController:stateChanged` publishes preference and history changes.

While the Active Venue is `resolving`, the root route and the legacy market-list route render nothing. Venue changes remount the active branch (`PredictImplementationSwitch`). Cross-Venue lifecycle handling belongs to B3 (PRED-1383).
