import { PerpsMarketData } from '../PerpsMarketListView/PerpsMarketListView.types';

/**
 * Props for PerpsMarketRowItem component
 */
export interface PerpsMarketRowItemProps {
  /**
   * Market data to display in the row
   */
  market: PerpsMarketData;
  /**
   * Callback when the row is pressed
   */
  onPress?: (market: PerpsMarketData) => void;
}
