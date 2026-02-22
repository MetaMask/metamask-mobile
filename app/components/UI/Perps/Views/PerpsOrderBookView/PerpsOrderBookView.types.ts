import type { PerpsMarketData } from '../../controllers/types';

export interface PerpsOrderBookViewProps {
  testID?: string;
}

export interface OrderBookRouteParams {
  symbol: string;
  marketData?: PerpsMarketData;
}
