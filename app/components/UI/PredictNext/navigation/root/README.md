# Predict root router

`PredictRoot` is the component registered for the shared `Predict` root route. It is exported from the PredictNext entry point (`../../index.ts`). Through `PredictImplementationSwitch`, it mounts either the complete legacy Polymarket stack or the independent PredictNext stack; controllers, navigation state, views, and domain models are not shared.

Generic Predict and unparameterized `PredictMarketList` entries use the Active Venue. Legacy feed/search parameters, specific child routes, and existing Predict deep links stay on Polymarket (`resolvePinnedVenue`). The legacy `PredictMarketListRoute` applies the same market-list rule through `resolvePredictMarketListLane` and mounts the result through `PredictImplementationSwitch` too, so the PredictNext stack always receives its Venue (`useNextVenueId`). A live Active Venue change remounts the chosen stack at its home screen rather than translating navigation state.

PRED-1379 removes the route-level Polymarket pinning once entry points become intents. PRED-1377 replaces the Active Venue rule behind `usePredictImplementation`. The legacy market-list route calls the pure config rule directly, so that change must cover it too.
