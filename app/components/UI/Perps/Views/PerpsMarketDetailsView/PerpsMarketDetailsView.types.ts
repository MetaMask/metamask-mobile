import type { EdgeInsets } from 'react-native-safe-area-context';
import type { PerpsMarketDetailGenerationTrigger } from '../../hooks/usePerpsMarketDetailSession';

export interface PerpsMarketDetailsViewProps {
  generationTrigger?: Extract<
    PerpsMarketDetailGenerationTrigger,
    'initial' | 'market_switch' | 'mode_switch'
  >;
  /** Set when the screen runs under the status bar and home indicator. */
  edgeInsets?: Pick<EdgeInsets, 'top' | 'bottom'>;
}

export interface MarketStatistics {
  high24h: string;
  low24h: string;
  volume24h: string;
  openInterest: string;
  fundingRate: string;
  countdown: string;
}
