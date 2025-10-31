export interface PerpsMarketHoursBannerProps {
  /**
   * Market type to determine if banner should be displayed
   */
  marketType?: string;

  /**
   * Callback when info icon is pressed
   */
  onInfoPress: () => void;

  /**
   * Optional test ID for testing
   */
  testID?: string;
}
