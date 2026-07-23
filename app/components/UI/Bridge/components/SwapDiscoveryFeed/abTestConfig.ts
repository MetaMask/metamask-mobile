import { UnifiedSwapBridgeEventName } from '@metamask/bridge-controller';
import { ASSET_VIEWED_PROPERTY } from '../../../../../core/Analytics/trade-transaction-funnel/assetViewedAnalytics';
import { EVENT_NAME } from '../../../../../core/Analytics/MetaMetrics.events';
import { TokenDetailsSource } from '../../../TokenDetails/constants/constants';
import type { ABTestAnalyticsMapping } from '../../../../../util/analytics/abTestAnalytics.types';

export const SWAP_DISCOVERY_FEED_REVAMP_AB_KEY =
  'swapsSWAPS4666AbtestDiscoveryFeedRevamp';

export enum SwapDiscoveryFeedRevampVariant {
  Control = 'control',
  DiscoveryFeed = 'discovery_feed',
  Empty = 'empty',
}

export type SwapDiscoveryFeedMode = 'control' | 'discovery_feed' | 'empty';

export interface SwapDiscoveryFeedVariantConfig {
  mode: SwapDiscoveryFeedMode;
}

export const SWAP_DISCOVERY_FEED_REVAMP_VARIANTS: Record<
  SwapDiscoveryFeedRevampVariant,
  SwapDiscoveryFeedVariantConfig
> = {
  [SwapDiscoveryFeedRevampVariant.Control]: { mode: 'control' },
  [SwapDiscoveryFeedRevampVariant.DiscoveryFeed]: { mode: 'discovery_feed' },
  [SwapDiscoveryFeedRevampVariant.Empty]: { mode: 'empty' },
};

export const SWAP_DISCOVERY_FEED_REVAMP_EXPOSURE_METADATA = {
  experimentName: 'Swap Discovery Feed Revamp',
  variationNames: {
    [SwapDiscoveryFeedRevampVariant.Control]: 'Current Trending-only section',
    [SwapDiscoveryFeedRevampVariant.DiscoveryFeed]:
      'Hot tokens, Trending, and Stocks discovery feed',
    [SwapDiscoveryFeedRevampVariant.Empty]: 'No discovery content',
  },
};

export const SWAP_DISCOVERY_FEED_REVAMP_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: SWAP_DISCOVERY_FEED_REVAMP_AB_KEY,
    validVariants: Object.values(SwapDiscoveryFeedRevampVariant),
    eventNames: [
      EVENT_NAME.SWAP_PAGE_VIEWED,
      UnifiedSwapBridgeEventName.QuotesRequested,
      UnifiedSwapBridgeEventName.QuotesReceived,
      UnifiedSwapBridgeEventName.Submitted,
      UnifiedSwapBridgeEventName.Completed,
      EVENT_NAME.ASSET_VIEWED,
      EVENT_NAME.EXPLORE_INTERACTED,
      EVENT_NAME.TOKEN_DETAILS_OPENED,
    ],
    eventPropertyRequirements: {
      [EVENT_NAME.ASSET_VIEWED]: {
        [ASSET_VIEWED_PROPERTY.TRADE_TYPE]: 'Swaps',
      },
      [EVENT_NAME.EXPLORE_INTERACTED]: {
        source: 'swaps',
      },
      [EVENT_NAME.TOKEN_DETAILS_OPENED]: {
        source: [
          TokenDetailsSource.TrendingSwaps,
          TokenDetailsSource.MoversSwaps,
          TokenDetailsSource.RwasStocksSwaps,
        ],
      },
    },
  };
