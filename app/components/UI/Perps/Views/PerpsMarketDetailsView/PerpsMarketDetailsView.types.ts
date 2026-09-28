import type { PerpsMarketDetailGenerationTrigger } from '../../hooks/usePerpsMarketDetailSession';

export interface PerpsMarketDetailsViewProps {
  generationTrigger?: Extract<
    PerpsMarketDetailGenerationTrigger,
    'initial' | 'market_switch' | 'mode_switch'
  >;
  /** iOS 26 PoC: the router decides when the native bar may own the header. */
  isNativeHeaderEnabled?: boolean;
}

export interface MarketStatistics {
  high24h: string;
  low24h: string;
  volume24h: string;
  openInterest: string;
  fundingRate: string;
  countdown: string;
}
