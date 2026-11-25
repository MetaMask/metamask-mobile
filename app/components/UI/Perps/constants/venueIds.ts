import type { PerpsProviderType } from '@metamask/perps-controller';

/** Selectable venues, in exchange-filter display order. */
export const PERPS_VENUE_IDS: readonly PerpsProviderType[] = [
  'lighter',
  'hyperliquid',
];
export const isPerpsVenueId = (id: unknown): id is PerpsProviderType =>
  PERPS_VENUE_IDS.some((venue) => venue === id);
