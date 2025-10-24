/**
 * Props for PerpsMarketTimeBottomSheet component
 */
export interface PerpsMarketTimeBottomSheetProps {
  /**
   * Whether the bottom sheet is visible
   */
  isVisible: boolean;
  /**
   * Callback when bottom sheet should close
   */
  onClose: () => void;
  /**
   * Currently selected timeframe ('1h' or '24h')
   */
  selectedTimeframe: string;
  /**
   * Callback when a timeframe is selected
   * @param timeframe - The selected timeframe ('1h' or '24h')
   */
  onTimeframeSelect: (timeframe: string) => void;
  /**
   * Test ID for E2E testing
   */
  testID?: string;
}
