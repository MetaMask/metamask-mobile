import type {
  Position,
  TraderProfileResponse,
} from '@metamask/social-controllers';
import ReactQueryService from '../../../ReactQueryService';
import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import { navigateToSocialV1Profile } from '../../../../components/Views/SocialLeaderboard/navigation/navigateToSocialV1Profile';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import type { SocialV1FeedAuthor } from '../../../../components/UI/SocialFeed/types';
import { toWholePercent } from '../../../../components/UI/SocialFeed/utils/feedCardStats';
import { buildTraderProfileQueryKey } from '../../../../util/social/traderProfileQueries';
import { resolvePositionAuthorProfileId } from '../../../../util/social/positionOwnership';

const LOG_PREFIX = '[socialPositionSheetDeeplink]';

const fetchSocialTraderProfile = async (
  traderId: string,
  logPrefix: string,
): Promise<TraderProfileResponse | undefined> => {
  try {
    return await ReactQueryService.queryClient.query<TraderProfileResponse>({
      queryKey: buildTraderProfileQueryKey(traderId),
    });
  } catch (error) {
    DevLogger.log(`${logPrefix} Failed to resolve the post author:`, error);
    return undefined;
  }
};

/**
 * The position sheet reads `author.id` unconditionally, so a degraded author
 * still beats not opening the position the link named. Keeping the trader id
 * as `id` preserves the sheet's own-post chrome.
 */
const toSocialPositionAuthor = (
  traderId: string,
  response: TraderProfileResponse | undefined,
): SocialV1FeedAuthor => {
  if (!response) {
    return { id: traderId, username: '', winRatePercent: null };
  }
  const { profile, stats, followerCount } = response;
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
};

const resolveSocialPositionAuthor = async (
  traderId: string,
  logPrefix: string,
): Promise<SocialV1FeedAuthor> =>
  toSocialPositionAuthor(
    traderId,
    await fetchSocialTraderProfile(traderId, logPrefix),
  );

/**
 * Fetches the position a link names. A hidden, removed or moderated position
 * resolves to `undefined`, as does a failed request.
 */
const fetchSocialPosition = async (
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

export interface SharedSocialPosition {
  position: Position;
  author: SocialV1FeedAuthor;
  /** The link's `traderId` doesn't own the position; `author` is the owner. */
  isOwnerMismatch: boolean;
}

/**
 * Resolves a shared position and the author to show it under. The link's
 * `traderId` is fetched alongside the position, not after it, and only
 * attributed once the position's owner confirms it.
 */
export const resolveSharedSocialPosition = async (
  positionId: string,
  traderId: string,
  logPrefix: string,
): Promise<SharedSocialPosition | undefined> => {
  const [position, traderProfile] = await Promise.all([
    fetchSocialPosition(positionId, logPrefix),
    fetchSocialTraderProfile(traderId, logPrefix),
  ]);
  if (!position) {
    return undefined;
  }

  const authorProfileId = resolvePositionAuthorProfileId(
    position,
    traderId,
    traderProfile?.profile,
  );
  if (authorProfileId === traderId) {
    return {
      position,
      author: toSocialPositionAuthor(traderId, traderProfile),
      isOwnerMismatch: false,
    };
  }

  DevLogger.log(
    `${logPrefix} The link's trader does not own the position; showing its owner`,
  );
  return {
    position,
    author: await resolveSocialPositionAuthor(authorProfileId, logPrefix),
    isOwnerMismatch: true,
  };
};

/**
 * A shared position opens like a profile row tap: the trader's Social V1
 * profile, with the position sheet over it. A position that can no longer be
 * fetched leaves the user on the profile. A position the trader doesn't own
 * opens on its real owner's profile instead.
 */
export const openSharedPositionOnProfile = (
  positionId: string,
  traderId: string,
): void => {
  navigateToSocialV1Profile(NavigationService.navigation, {
    traderId,
    source: 'deep_link',
  });
  resolveSharedSocialPosition(positionId, traderId, LOG_PREFIX)
    .then((shared) => {
      if (!shared) {
        return;
      }
      const { position, author, isOwnerMismatch } = shared;
      if (isOwnerMismatch) {
        navigateToSocialV1Profile(NavigationService.navigation, {
          traderId: author.id,
          traderName: author.username,
          traderAddress: author.address,
          traderAvatarUri: author.avatarUri ?? undefined,
          source: 'deep_link',
        });
      }
      NavigationService.navigation.navigate(Routes.SOCIAL.POSITION_SHEET, {
        positionId,
        position,
        author,
        shareSource: 'deep_link',
      });
    })
    .catch((error: unknown) => {
      DevLogger.log(`${LOG_PREFIX} Failed to open the position sheet:`, error);
    });
};
