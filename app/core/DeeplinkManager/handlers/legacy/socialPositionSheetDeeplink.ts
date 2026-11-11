import type {
  Position,
  TraderProfileResponse,
} from '@metamask/social-controllers';
import ReactQueryService from '../../../ReactQueryService';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import type { SocialV1FeedAuthor } from '../../../../components/UI/SocialFeed/types';
import { toWholePercent } from '../../../../components/UI/SocialFeed/utils/feedCardStats';
import { buildTraderProfileQueryKey } from '../../../../util/social/traderProfileQueries';

/**
 * The position sheet reads `author.id` unconditionally, so a degraded author
 * still beats not opening the position the link named. Keeping the trader id
 * as `id` preserves the sheet's own-post chrome.
 */
export const resolveSocialPositionAuthor = async (
  traderId: string,
  logPrefix: string,
): Promise<SocialV1FeedAuthor> => {
  try {
    const { profile, stats, followerCount } =
      await ReactQueryService.queryClient.query<TraderProfileResponse>({
        queryKey: buildTraderProfileQueryKey(traderId),
      });

    return {
      id: profile.profileId,
      username: profile.name,
      address: profile.address,
      avatarUri: profile.imageUrl,
      winRatePercent: toWholePercent(stats.winRate30d),
      pnl30d: stats.pnl30d,
      tradeCount30d: stats.tradeCount30d,
      followerCount,
    };
  } catch (error) {
    DevLogger.log(`${logPrefix} Failed to resolve the post author:`, error);
    return { id: traderId, username: '', winRatePercent: null };
  }
};

/**
 * Fetches the position a link names. A hidden, removed or moderated position
 * resolves to `undefined`, as does a failed request.
 */
export const fetchSocialPosition = async (
  positionId: string,
  logPrefix: string,
): Promise<Position | undefined> => {
  try {
    return await ReactQueryService.queryClient.query<Position>({
      queryKey: ['SocialService:fetchPositionById', { positionId }],
    });
  } catch (error) {
    DevLogger.log(`${logPrefix} Failed to fetch the position:`, error);
    return undefined;
  }
};
