import { FeatureId } from '@metamask/bridge-controller';

import type { QuickBuySheetSource } from '../analytics';

export function getQuickBuyFeatureId(source?: QuickBuySheetSource): FeatureId {
  switch (source) {
    case 'asset_details':
    case 'market_insights':
    case 'security_trust':
      return FeatureId.QUICK_BUY_TOKEN_DETAILS;
    case 'leaderboard':
    case 'profile_position':
    case 'notification':
      return FeatureId.QUICK_BUY_FOLLOW_TRADING;
    case 'explore_search':
    case 'explore_crypto':
    case 'explore_now':
    case 'explore_rwas':
    case 'explore_stocks':
      return FeatureId.QUICK_BUY_EXPLORE;
    default:
      return FeatureId.UNKNOWN;
  }
}
