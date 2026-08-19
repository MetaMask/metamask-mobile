import type { PerpsMarketData } from '@metamask/perps-controller';

export interface PerpsRecentlyAddedSectionProps {
  markets: PerpsMarketData[];
  onMarketPress: (market: PerpsMarketData) => void;
  /** Called when the section header is pressed. Omit to render a non-interactive header. */
  onViewAllPress?: () => void;
}
