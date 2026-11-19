import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import type { QuickBuySheetSource } from '../analytics';

export function getQuickBuyEntryPoint(
  source?: QuickBuySheetSource,
): MetaMetricsSwapsEventSource {
  switch (source) {
    case 'asset_details':
    case 'market_insights':
    case 'security_trust':
      return MetaMetricsSwapsEventSource.TokenView;
    case 'leaderboard':
    case 'trader_feed':
    case 'social_trending':
    case 'social_following':
    case 'social_live_trades':
      return MetaMetricsSwapsEventSource.FollowTradingFeedScreen;
    case 'notification':
    case 'profile_position':
      return MetaMetricsSwapsEventSource.FollowTradingTokenScreen;
    case 'explore_search':
    case 'explore_crypto':
    case 'explore_now':
    case 'explore_rwas':
    case 'explore_stocks':
      return MetaMetricsSwapsEventSource.TrendingExplore;
    default:
      return MetaMetricsSwapsEventSource.Unknown;
  }
}
