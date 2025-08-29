import type { Position, Order, PriceUpdate } from '../../controllers/types';
import { usePerpsMarketStats } from '../../hooks';

export interface TabViewProps {
  tabLabel: string;
}

export interface PerpsMarketTabsProps {
  marketStats: ReturnType<typeof usePerpsMarketStats>;
  position: Position | null;
  isLoadingPosition: boolean;
  unfilledOrders: Order[];
  onPositionUpdate?: () => Promise<void>;
  onActiveTabChange?: (tabId: string) => void;
  priceData?: PriceUpdate | null;
}
