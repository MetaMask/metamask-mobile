import {
  SocialEvent,
  type SocialEventSource,
} from '../../Views/SocialLeaderboard/analytics/socialEvents';

/**
 * Quick Buy `source` and Perps order `source` for a Social feed tab.
 * `social_live` is the surface location; the analytics value is `social_live_trades`.
 * Other surfaces keep their existing source.
 */
export const socialFeedSurfaceOrderSource = (
  location: string | undefined,
):
  | 'social_trending'
  | 'social_following'
  | 'social_live_trades'
  | undefined => {
  switch (location) {
    case 'social_trending':
      return 'social_trending';
    case 'social_following':
      return 'social_following';
    case 'social_live':
      return 'social_live_trades';
    default:
      return undefined;
  }
};

/**
 * Social event `source` for a sheet or screen opened from a feed surface.
 * Undefined for surfaces with no Social source value.
 */
export const socialFeedSurfaceAnalyticsSource = (
  location: string | undefined,
): SocialEventSource | undefined => {
  switch (location) {
    case 'my_profile':
    case 'trader_profile':
      return SocialEvent.Source.TRADER_PROFILE;
    case 'token_details':
      return SocialEvent.Source.ASSET_DETAILS;
    case 'perps_home':
      return SocialEvent.Source.PERPS_HOME;
    case 'perps_market_details':
      return SocialEvent.Source.PERP_ASSET_SCREEN;
    default:
      return socialFeedSurfaceOrderSource(location);
  }
};
