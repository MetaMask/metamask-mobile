/**
 * Default minimum volume (USD) required to qualify for the perps trading
 * competition leaderboard when the API does not provide `minVolumeForEligibility`.
 */
export const PERPS_QUALIFICATION_NOTIONAL_USD = 25_000;

/**
 * Default number of prize-winning ranks for a perps trading campaign, used when
 * the leaderboard API does not provide `numberOfWinners`.
 */
export const PERPS_TRADING_MAX_WINNERS = 20;

/** HyperTracker attribution URL for the perps trading campaign leaderboard. */
export const HYPERTRACKER_ATTRIBUTION_URL =
  'https://hypertracker.io?utm_source=metamask&utm_medium=leaderboard&utm_campaign=partner-attribution';
