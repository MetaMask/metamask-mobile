import type { PerpsMarketData } from '@metamask/perps-controller/types';

export interface PerpsOrderBookViewProps {
  testID?: string;
}

export interface OrderBookRouteParams {
  symbol: string;
  marketData?: PerpsMarketData;
}
