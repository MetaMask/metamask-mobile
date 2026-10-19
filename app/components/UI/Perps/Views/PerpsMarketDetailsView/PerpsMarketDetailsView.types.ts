import type { PerpsMarketDetailGenerationTrigger } from '../../hooks/usePerpsMarketDetailSession';

export interface PerpsMarketDetailsViewProps {
  generationTrigger?: Extract<
    PerpsMarketDetailGenerationTrigger,
    'initial' | 'market_switch' | 'mode_switch'
  >;
}

export interface MarketStatistics {
  high24h: string;
  low24h: string;
  volume24h: string;
  openInterest: string;
  fundingRate: string;
  countdown: string;
}
