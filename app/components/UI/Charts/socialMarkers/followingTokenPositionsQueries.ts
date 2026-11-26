import type { FetchFollowingTokenPositionsOptions } from './types';

/**
 * Query key for the followed-traders token-positions endpoint (PR #398).
 *
 * Mirrors the `['SocialService:<action>', options]` shape used by the other
 * Social queries (see `app/util/social/traderProfileQueries.ts`). The action
 * `SocialService:fetchFollowingTokenPositions` does not exist in
 * `@metamask/social-controllers` yet — until it lands, this query resolves to
 * an error and the UI simply shows no markers (graceful no-op).
 */
export const buildFollowingTokenPositionsQueryKey = (
  assetId: string,
  page?: number,
): [string, FetchFollowingTokenPositionsOptions] => [
  'SocialService:fetchFollowingTokenPositions',
  { assetId, ...(page ? { page } : {}) },
];
