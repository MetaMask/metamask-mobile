import type { PerpsMarketData } from '@metamask/perps-controller';

export interface PerpsRecentlyAddedSectionProps {
  markets: PerpsMarketData[];
  onMarketPress: (market: PerpsMarketData) => void;
}
