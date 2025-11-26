/**
 * PerpsOHLCVBar Component Types
 *
 * Defines the interface for the OHLCV (Open, High, Low, Close, Volume) bar component
 * that displays real-time candle data above the trading chart.
 */

/**
 * Props for the PerpsOHLCVBar component
 */
export interface PerpsOHLCVBarProps {
  /**
   * Opening price of the candle (string to preserve precision)
   */
  open: string;

  /**
   * Highest price of the candle
   */
  high: string;

  /**
   * Lowest price of the candle
   */
  low: string;

  /**
   * Closing price of the candle
   */
  close: string;

  /**
   * Trading volume for the candle (optional)
   * Will be formatted with K/M/B/T suffixes
   */
  volume?: string;

  /**
   * Test ID for automated testing
   */
  testID?: string;
}

/**
 * Style dependencies for PerpsOHLCVBar component
 */
export interface PerpsOHLCVBarStyleSheetOptions {
  // Currently no dynamic style options needed
  // Can be extended if theming requirements change
}
