import { UnifiedSwapBridgeEventName } from '@metamask/bridge-controller';
import { ASSET_VIEWED_PROPERTY } from '../../../../../core/Analytics/trade-transaction-funnel/assetViewedAnalytics';
import { EVENT_NAME } from '../../../../../core/Analytics/MetaMetrics.events';
import type { ABTestAnalyticsMapping } from '../../../../../util/analytics/abTestAnalytics.types';

export const CHAIN_VALUE_ORDER_AB_KEY = 'swapsSWAPS4825AbtestChainValueOrder';

export enum ChainValueOrderVariant {
  Control = 'control',
  Treatment = 'treatment',
}

export interface ChainValueOrderVariantConfig {
  orderByValue: boolean;
}

export const CHAIN_VALUE_ORDER_VARIANTS: Record<
  ChainValueOrderVariant,
  ChainValueOrderVariantConfig
> = {
  [ChainValueOrderVariant.Control]: {
    orderByValue: false,
  },
  [ChainValueOrderVariant.Treatment]: {
    orderByValue: true,
  },
};

export const CHAIN_VALUE_ORDER_EXPOSURE_METADATA = {
  experimentName: 'Chain Value Order',
  variationNames: {
    [ChainValueOrderVariant.Control]: 'LaunchDarkly chain ranking',
    [ChainValueOrderVariant.Treatment]:
      'Holdings value with remote position overrides',
  },
};

export const CHAIN_VALUE_ORDER_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: CHAIN_VALUE_ORDER_AB_KEY,
    validVariants: Object.values(ChainValueOrderVariant),
    eventNames: [
      EVENT_NAME.SWAP_PAGE_VIEWED,
      EVENT_NAME.ASSET_VIEWED,
      UnifiedSwapBridgeEventName.AssetPickerOpened,
      UnifiedSwapBridgeEventName.QuotesRequested,
      UnifiedSwapBridgeEventName.QuotesReceived,
      UnifiedSwapBridgeEventName.Submitted,
      UnifiedSwapBridgeEventName.Completed,
    ],
    eventPropertyRequirements: {
      [EVENT_NAME.ASSET_VIEWED]: {
        [ASSET_VIEWED_PROPERTY.TRADE_TYPE]: 'Swaps',
      },
    },
  };
