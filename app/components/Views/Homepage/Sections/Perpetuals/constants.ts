export const MAX_ITEMS = 5;
export const MAX_TRENDING_MARKETS = 5;
// Positions render live values, so they subscribe at the same cadence the perps
// screens use (usePerpsHomeData, PerpsPositionsView, PerpsProPositionsPanel)
// instead of lagging a full refresh window behind.
export const HOMEPAGE_THROTTLE_MS = 1000;
// The account channel is only read for its initial-load flag, so it stays on the
// slower cadence rather than re-rendering the section every second for a value
// nothing displays.
export const HOMEPAGE_ACCOUNT_THROTTLE_MS = 5000;
