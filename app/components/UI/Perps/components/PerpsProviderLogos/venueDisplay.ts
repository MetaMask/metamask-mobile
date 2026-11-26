import type { PerpsProviderType } from '@metamask/perps-controller';

import hyperliquidLogo from './assets/hyperliquid.png';
import lighterLogo from './assets/lighter.png';

/** Shared mark and tagline for each trade venue in market UI. */
export const VENUE_DISPLAY = {
  hyperliquid: {
    logo: hyperliquidLogo as number,
    taglineKey: 'perps.exchange_filter.tagline_hyperliquid',
  },
  lighter: {
    logo: lighterLogo as number,
    taglineKey: 'perps.exchange_filter.tagline_lighter',
  },
} as const satisfies Record<
  PerpsProviderType,
  { logo: number; taglineKey: string }
>;
