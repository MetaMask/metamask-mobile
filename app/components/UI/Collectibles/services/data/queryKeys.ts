import { PACK_PARTNER_ENVIRONMENT } from '../../providers/pack-partner/constants';

/** Viewer identity is part of every optional query, including public Social lists. */
export const collectiblesDataScope = (account?: { address: string }) =>
  `${PACK_PARTNER_ENVIRONMENT}:${account?.address ?? 'public'}`;

/** Relationship changes affect copied profile metadata and friends, never Collectibles scores. */
export const isCollectiblesFollowQuery = (
  scope: string,
  query: { queryKey: readonly unknown[] },
  profileId?: string,
) =>
  (query.queryKey[0] !== 'CollectiblesSocialApiDataService:getProfile' ||
    !profileId ||
    (query.queryKey[2] as { profileId?: string } | undefined)?.profileId ===
      profileId) &&
  query.queryKey[1] === scope &&
  ['getProfile', 'getPackSocialContext', 'getFeed', 'getLeaderboard'].some(
    (method) =>
      query.queryKey[0] === `CollectiblesSocialApiDataService:${method}`,
  );
