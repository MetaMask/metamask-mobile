import { PerpsMarketData } from '../../controllers/types';

export interface MarketStatistics {
  high24h: string;
  low24h: string;
  volume24h: string;
  openInterest: string;
  fundingRate: string;
  countdown: string;
}

export interface MarketDetailsRouteParams {
  market: PerpsMarketData;
  isNavigationFromOrderSuccess?: boolean;
}
