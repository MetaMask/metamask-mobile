import Engine from '../../../../core/Engine';
import type { FollowingTokenPositionsResponse } from './types';
import { buildMockFollowingTokenPositions } from './mockFollowingTokenPositions';

/**
 * TEMPORARY (ASSETS-4102 spike): when true, short-circuit the network request
 * and return {@link buildMockFollowingTokenPositions} so chart avatar markers
 * can be tested on any token without a following account. SET TO false / REMOVE
 * (with the mock file) before merge.
 */
const SPIKE_USE_MOCK = true;

/**
 * TEMPORARY (ASSETS-4102 spike): raw client for
 * `GET /api/v1/positions/{assetId}/followed-by-me`.
 *
 * Returns the largest open positions in a token among traders the user follows
 * (page-based, 20 per page). This bypasses `@metamask/social-controllers`,
 * which does not yet expose a matching `SocialService` action. Replace with the
 * messenger action + `useQuery` (reading `AppConstants.SOCIAL_API_URL`) once the
 * package ships it. Auth is the same bearer token SocialService sends.
 *
 * The host is hardcoded to DEV so it matches the dev build's auth token.
 * REVERT to `AppConstants.SOCIAL_API_URL` before merge.
 */
const SPIKE_DEV_SOCIAL_API_URL = 'https://social.dev-api.cx.metamask.io';

export const followingTokenPositionsUrl = (
  assetId: string,
  page?: number,
): string => {
  const base = `${SPIKE_DEV_SOCIAL_API_URL}/api/v1/positions/${encodeURIComponent(
    assetId,
  )}/followed-by-me`;
  return page && page > 1 ? `${base}?page=${page}` : base;
};

export const fetchFollowingTokenPositions = async (
  assetId: string,
  signal?: AbortSignal,
  page?: number,
): Promise<FollowingTokenPositionsResponse> => {
  // TEMPORARY (ASSETS-4102 spike): serve a local mock so markers render on any
  // token without an authenticated following account. REMOVE before merge.
  if (SPIKE_USE_MOCK) {
    return buildMockFollowingTokenPositions(assetId);
  }

  const token = await Engine.controllerMessenger.call(
    'AuthenticationController:getBearerToken',
  );

  const response = await fetch(followingTokenPositionsUrl(assetId, page), {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `followed-by-me request failed: ${response.status} ${body}`,
    );
  }

  return (await response.json()) as FollowingTokenPositionsResponse;
};
