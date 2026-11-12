import {
  SocialEvent,
  type SocialPositionAnalyticsProperties,
} from '../../../Views/SocialLeaderboard/analytics/socialEvents';
import type { SocialV1FeedAuthor, SocialV1FeedPost } from '../types';

const { Direction, PositionStatus, Trade } = SocialEvent;

interface SocialPositionAnalyticsInput {
  isPerp: boolean;
  asset?: string;
  direction?: 'long' | 'short' | null;
  isClosed?: boolean;
  author?: Pick<SocialV1FeedAuthor, 'address' | 'username'>;
}

/** Trader, asset and position state shared by Social position events. */
export const buildSocialPositionAnalytics = ({
  isPerp,
  asset,
  direction,
  isClosed,
  author,
}: SocialPositionAnalyticsInput): SocialPositionAnalyticsProperties => ({
  trade_type: isPerp ? Trade.PERPS : Trade.SPOT,
  ...(asset ? { asset } : {}),
  ...(isPerp && direction
    ? { direction: direction === 'short' ? Direction.SHORT : Direction.LONG }
    : {}),
  ...(isClosed === undefined
    ? {}
    : {
        position_status: isClosed ? PositionStatus.CLOSED : PositionStatus.OPEN,
      }),
  ...(author?.address ? { trader_address: author.address } : {}),
  ...(author?.username ? { trader_username: author.username } : {}),
});

/** {@link buildSocialPositionAnalytics} for a feed post card. */
export const socialFeedPostAnalytics = (
  post: SocialV1FeedPost,
): SocialPositionAnalyticsProperties => {
  const { item } = post;
  const isPerp = item.variant === 'perpsOpen' || item.variant === 'perpsClosed';
  return buildSocialPositionAnalytics({
    isPerp,
    asset: item.asset.symbol,
    direction: 'direction' in item ? item.direction : undefined,
    isClosed: item.variant === 'perpsClosed' || item.variant === 'spotClosed',
    author: {
      address: item.author.address,
      username: post.authorHandle || item.author.username,
    },
  });
};
