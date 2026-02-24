import { type PerpsMarketData } from '@metamask/perps-controller';

export interface PerpsOrderBookViewProps {
  testID?: string;
}

export interface OrderBookRouteParams {
  symbol: string;
  marketData?: PerpsMarketData;
}
