export interface PerpsMarketDetailsViewProps {
  // Empty for now, will receive market data from navigation params
}

export interface MarketStatistics {
  high24h: string;
  low24h: string;
  volume24h: string;
  openInterest: string;
  fundingRate: string;
  countdown: string;
}
