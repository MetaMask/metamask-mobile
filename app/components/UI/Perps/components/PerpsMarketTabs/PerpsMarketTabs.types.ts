import type { Position, Order } from '../../controllers/types';
import { usePerpsMarketStats } from '../../hooks';

export type PerpsTabId = 'position' | 'orders' | 'statistics';

export interface TabViewProps {
  tabLabel: string;
}

export interface PerpsMarketTabsProps {
  /**
   * Symbol for the market (e.g., 'BTC', 'ETH')
   */
  symbol: string;
  marketStats: ReturnType<typeof usePerpsMarketStats>;
  position: Position | null;
  isLoadingPosition: boolean;
  unfilledOrders: Order[];
  onActiveTabChange?: (tabId: string) => void;
  activeTabId?: string;
  /**
   * Initial tab to select when component mounts
   */
  initialTab?: PerpsTabId;
  /**
   * Next funding time in milliseconds since epoch (optional, market-specific)
   */
  nextFundingTime?: number;
  /**
   * Funding interval in hours (optional, market-specific)
   */
  fundingIntervalHours?: number;
  /**
   * Callback when an order is selected for TP/SL chart integration
   */
  onOrderSelect?: (orderId: string) => void;
  /**
   * Currently active TP order ID being displayed on chart
   */
  activeTPOrderId?: string | null;
  /**
   * Currently active SL order ID being displayed on chart
   */
  activeSLOrderId?: string | null;
}
