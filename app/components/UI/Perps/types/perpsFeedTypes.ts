import type { PerpsMarketData } from '@metamask/perps-controller';

/** Per-item enrichment for perps feed rails and carousels. */
export interface PerpsFeedItem {
  market: PerpsMarketData;
  sparkline?: number[];
  isWatchlisted: boolean;
}
