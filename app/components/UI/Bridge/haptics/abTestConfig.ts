import { UnifiedSwapBridgeEventName } from '@metamask/bridge-controller';
import { ASSET_VIEWED_PROPERTY } from '../../../../core/Analytics/trade-transaction-funnel/assetViewedAnalytics';
import { EVENT_NAME } from '../../../../core/Analytics/MetaMetrics.events';
import type { ABTestAnalyticsMapping } from '../../../../util/analytics/abTestAnalytics.types';

export const SWAPS_HAPTICS_AB_KEY = 'swapsSWAPS4780AbtestSwapHaptics';

export enum SwapsHapticsVariant {
  Control = 'control',
  Treatment = 'treatment',
}

export interface SwapsHapticsVariantConfig {
  enableSwapHaptics: boolean;
}

export const SWAPS_HAPTICS_VARIANTS: Record<
  SwapsHapticsVariant,
  SwapsHapticsVariantConfig
> = {
  [SwapsHapticsVariant.Control]: { enableSwapHaptics: false },
  [SwapsHapticsVariant.Treatment]: { enableSwapHaptics: true },
};

export const SWAPS_HAPTICS_EXPOSURE_METADATA = {
  experimentName: 'Swap Haptics V1',
  variationNames: {
    [SwapsHapticsVariant.Control]: 'No swap-specific haptics',
    [SwapsHapticsVariant.Treatment]:
      'High-signal haptics (toggle, flip, tx lifecycle)',
  },
};

export const SWAPS_HAPTICS_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping = {
  flagKey: SWAPS_HAPTICS_AB_KEY,
  validVariants: Object.values(SwapsHapticsVariant),
  eventNames: [
    EVENT_NAME.SWAP_PAGE_VIEWED,
    EVENT_NAME.ASSET_VIEWED,
    UnifiedSwapBridgeEventName.FiatCryptoToggleClicked,
    UnifiedSwapBridgeEventName.Submitted,
    UnifiedSwapBridgeEventName.Completed,
    UnifiedSwapBridgeEventName.Failed,
  ],
  eventPropertyRequirements: {
    [EVENT_NAME.ASSET_VIEWED]: {
      [ASSET_VIEWED_PROPERTY.TRADE_TYPE]: 'Swaps',
    },
  },
};
