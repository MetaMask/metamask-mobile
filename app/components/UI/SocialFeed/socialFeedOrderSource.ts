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
