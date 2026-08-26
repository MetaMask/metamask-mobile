export interface PerpsProMarketStatsBarProps {
  /**
   * Raw market symbol used to subscribe to live stats (e.g. "BTC", "xyz:TSLA").
   */
  symbol: string;
  /**
   * Next funding time in milliseconds since epoch (optional, market-specific).
   * Feeds the funding-rate countdown, mirroring PerpsMarketStatisticsCard.
   */
  nextFundingTime?: number;
  /**
   * Funding interval in hours (optional, market-specific).
   */
  fundingIntervalHours?: number;
  /**
   * Optional testID override for the outer container. Defaults to the Pro
   * market view stats-bar selector so it slots into the existing scaffold.
   */
  testID?: string;
}
