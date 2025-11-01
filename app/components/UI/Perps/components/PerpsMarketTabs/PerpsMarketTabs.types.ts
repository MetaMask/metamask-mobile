export type PerpsTabId = 'position' | 'orders' | 'statistics';

export interface TabViewProps {
  tabLabel: string;
}

export interface PerpsMarketTabsProps {
  /**
   * Symbol for the market (e.g., 'BTC', 'ETH')
   */
  symbol: string;
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
   * Callback when an order is selected for chart integration
   */
  onOrderSelect?: (orderId: string) => void;
  /**
   * Callback when an order is cancelled to update chart
   */
  onOrderCancelled?: (orderId: string) => void;
  /**
   * ID of the currently active TP order shown on chart
   */
  activeTPOrderId?: string | null;
  /**
   * ID of the currently active SL order shown on chart
   */
  activeSLOrderId?: string | null;
}
