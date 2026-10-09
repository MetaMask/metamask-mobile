# Temporary Predict lane router

This boundary lives in legacy `Predict/` because the existing `Predict` root route is the shared entry point while production Polymarket remains on the legacy stack. It selects either the complete legacy Polymarket stack or the independent PredictNext Kalshi stack; controllers, navigation state, views, and domain models are not shared.

Generic Predict and unparameterized `PredictMarketList` entries may use the resolved Active Venue. Legacy feed/search parameters, specific child routes, and existing Predict deep links stay on Polymarket. A live selection change remounts the chosen stack at its home screen rather than translating navigation state.

PRED-1210 will replace the temporary preference (Kalshi only when it is the sole enabled Venue) with Venue Selection Preference and geolocation precedence. Delete this directory when legacy Predict is removed and the shared lane boundary is no longer needed.
