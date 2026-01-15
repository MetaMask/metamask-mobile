/**
 * Props for the PerpsDiscoveryBanner component
 */
export interface PerpsDiscoveryBannerProps {
  /**
   * Token symbol to display (e.g., 'BTC', 'ETH')
   */
  symbol: string;

  /**
   * Maximum leverage available as formatted string (e.g., '40x', '25x')
   */
  maxLeverage: string;

  /**
   * Callback when the banner is pressed
   */
  onPress: () => void;

  /**
   * Optional test ID for testing
   */
  testID?: string;
}
