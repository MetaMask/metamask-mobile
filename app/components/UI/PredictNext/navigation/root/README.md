# Predict root router

`PredictRoot` is the component registered for the shared `Predict` root route. It is exported from the PredictNext entry point (`../../index.ts`). Through `PredictImplementationSwitch`, it mounts either the complete legacy Polymarket stack or the independent PredictNext stack for the Active Venue; controllers, navigation state, views, and domain models are not shared.

The root router does not read its route: every entry serves the Active Venue. Callers outside Predict open it through intents (`../entry`, PRED-1379), which resolve against the same Active Venue and name a screen of the stack that serves it. The legacy `PredictMarketListRoute` mounts the Active Venue through `PredictImplementationSwitch` too, so the PredictNext stack always receives its Venue (`useNextVenueId`). A live Active Venue change remounts the chosen stack at its home screen rather than translating navigation state.

The Active Venue comes from `selectActiveVenue` (PRED-1377, see [`docs/active-venue.md`](../../docs/active-venue.md)); while it is `resolving`, both routes render nothing.
