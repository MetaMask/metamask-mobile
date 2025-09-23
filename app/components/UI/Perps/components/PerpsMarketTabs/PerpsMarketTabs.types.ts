import type { Position, Order } from '../../controllers/types';
import { usePerpsMarketStats } from '../../hooks';

export interface TabViewProps {
  tabLabel: string;
}

export interface PerpsMarketTabsProps {
  marketStats: ReturnType<typeof usePerpsMarketStats>;
  position: Position | null;
  isLoadingPosition: boolean;
  unfilledOrders: Order[];
  onActiveTabChange?: (tabId: string) => void;
  activeTabId?: string;
  /**
   * Next funding time in milliseconds since epoch (optional, market-specific)
   */
  nextFundingTime?: number;
  /**
   * Funding interval in hours (optional, market-specific)
   */
  fundingIntervalHours?: number;
}
