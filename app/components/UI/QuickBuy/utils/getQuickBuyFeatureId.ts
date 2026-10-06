import { FeatureId } from '@metamask/bridge-controller';

import type { QuickBuySheetSource } from '../analytics';

export function getQuickBuyFeatureId(source?: QuickBuySheetSource): FeatureId {
  switch (source) {
    case 'asset_details':
    case 'market_insights':
    case 'security_trust':
      return FeatureId.QUICK_BUY_TOKEN_DETAILS;
    case 'leaderboard':
    case 'trader_feed':
    case 'profile_position':
    case 'notification':
      return FeatureId.QUICK_BUY_FOLLOW_TRADING;
    case 'explore_search':
    case 'explore_crypto':
    case 'explore_now':
    case 'explore_rwas':
    case 'explore_stocks':
      return FeatureId.QUICK_BUY_EXPLORE;
    case 'gacha':
      // bridge-controller has no Gacha feature id yet; attribution relies on
      // the `gacha` analytics source until swaps adds one.
      return FeatureId.UNKNOWN;
    default:
      return FeatureId.UNKNOWN;
  }
}
