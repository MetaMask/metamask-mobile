import type { PerpsMarketData } from '@metamask/perps-controller';

export interface PerpsMarketTileCardProps {
  /** Market data to display */
  market: PerpsMarketData;
  /** Downsampled sparkline close prices (from usePerpsSparklineData) */
  sparklineData?: number[];
  /** Callback when the tile is pressed */
  onPress?: (market: PerpsMarketData) => void;
  /** Card width in pixels (default: 180) */
  cardWidth?: number;
  /** Card height in pixels (default: 180) */
  cardHeight?: number;
  /** Show a "Favorite" tag */
  showFavoriteTag?: boolean;
  /** Test ID for E2E testing */
  testID?: string;
}
