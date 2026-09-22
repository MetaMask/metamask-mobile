import { UnifiedSwapBridgeEventName } from '@metamask/bridge-controller';
import type { ABTestAnalyticsMapping } from '../../../../../util/analytics/abTestAnalytics.types';

export const GASLESS_SWAP_REDESIGN_AB_KEY =
  'swapsSWAPS5010AbtestGaslessSwapRedesign';

export enum GaslessSwapRedesignVariant {
  Control = 'control',
  Treatment = 'treatment',
}

export const GASLESS_SWAP_REDESIGN_VARIANTS = {
  [GaslessSwapRedesignVariant.Control]: { redesigned: false },
  [GaslessSwapRedesignVariant.Treatment]: { redesigned: true },
};

export const GASLESS_SWAP_REDESIGN_EXPOSURE_METADATA = {
  experimentName: 'Gasless Swap Redesign',
  variationNames: {
    [GaslessSwapRedesignVariant.Control]: 'Current gasless swap UI',
    [GaslessSwapRedesignVariant.Treatment]: 'Redesigned gasless swap UI',
  },
};

export const GASLESS_SWAP_REDESIGN_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: GASLESS_SWAP_REDESIGN_AB_KEY,
    validVariants: Object.values(GaslessSwapRedesignVariant),
    eventNames: [
      UnifiedSwapBridgeEventName.QuotesRequested,
      UnifiedSwapBridgeEventName.QuotesReceived,
      UnifiedSwapBridgeEventName.Submitted,
      UnifiedSwapBridgeEventName.Completed,
    ],
  };
