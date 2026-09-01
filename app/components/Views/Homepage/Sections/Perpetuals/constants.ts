export const MAX_ITEMS = 5;
export const MAX_TRENDING_MARKETS = 5;
// Matches the live cadence the perps screens subscribe at (usePerpsHomeData,
// PerpsPositionsView, PerpsProPositionsPanel) so wallet home positions stay in
// sync in real time instead of lagging a full refresh window behind.
export const HOMEPAGE_THROTTLE_MS = 1000;
