import type { usePerpsMarketStats } from '../../hooks/usePerpsMarketStats';
import type { PerpsTooltipContentKey } from '../PerpsBottomSheetTooltip';

export interface PerpsMarketStatisticsCardProps {
  /**
   * Symbol to subscribe to for live funding updates
   */
  symbol: string;
  marketStats: ReturnType<typeof usePerpsMarketStats>;
  onTooltipPress: (contentKey: PerpsTooltipContentKey) => void;
  /**
   * Next funding time in milliseconds since epoch (optional, market-specific)
   */
  nextFundingTime?: number;
  /**
   * Funding interval in hours (optional, market-specific)
   */
  fundingIntervalHours?: number;
  /**
   * DEX name for HIP-3 markets (e.g., "XYZ", "Hyperliquid")
   */
  dexName?: string;
  /**
   * Callback when order book row is pressed
   */
  onOrderBookPress?: () => void;
}
