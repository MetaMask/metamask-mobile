import type { FeedResponse } from '@metamask/social-controllers';
import type { CaipAssetType } from '@metamask/utils';
import { TOKEN_HOLDERS_FIXTURE } from './tokenHolders.fixture';

/** Holders requested per page. */
export const TOKEN_HOLDERS_PAGE_LIMIT = 30;

export interface TokenHoldersPageOptions {
  /** Narrow to traders the viewer follows (the later toggle on this tab). */
  followedByMe: boolean;
  /** Rows per page. Part of the cache key. */
  limit: number;
  /** Cursor from the previous page's `pagination.olderCursor`. */
  olderThan?: string;
}

export type TokenHoldersQueryKey = [
  'TokenDetailsHolders',
  CaipAssetType,
  { followedByMe: boolean; limit: number },
];

/**
 * `['TokenDetailsHolders', assetId, { followedByMe, page size }]`. The page
 * size is part of the key because a preview and a full list are different
 * first pages, and `followedByMe` because the two toggle states are two lists.
 */
export const buildTokenHoldersQueryKey = (
  assetId: CaipAssetType,
  {
    followedByMe,
    limit,
  }: Pick<TokenHoldersPageOptions, 'followedByMe' | 'limit'>,
): TokenHoldersQueryKey => [
  'TokenDetailsHolders',
  assetId,
  { followedByMe, limit },
];

const EMPTY_PAGE: FeedResponse = {
  items: [],
  pagination: { olderCursor: null, newerCursor: null },
};

/**
 * Fetches one page of holders for a CAIP-19 asset.
 *
 * This will call `GET /api/v1/positions/:assetId`, or
 * `GET /api/v1/positions/:assetId/followed-by-me` for the follow-scoped
 * toggle, both taking a CAIP-19 asset id. Neither route is deployed yet --
 * both 404 on `social.dev-api.cx.metamask.io` (what a dev build talks to) as
 * well as on prod, and `@metamask/social-controllers` has no messenger action
 * for them either -- so this is a placeholder transport, not a bug.
 *
 * Until then: dev builds read the fixture so the tab can be designed and
 * tested against realistic rows, and every other build gets an empty page.
 * Production must never show invented holders.
 *
 * The gate is `__DEV__`, deliberately not the API host: those are two
 * different axes. `AppConstants.SOCIAL_API_URL` falls back to the prod host
 * whenever `process.env.SOCIAL_API_URL` is unset, so anything outside
 * `scripts/build.sh` resolves to prod, and conversely a non-dev build can be
 * aimed at the dev cluster (main-exp/UAT is). Such a build takes the empty
 * branch and renders the empty state -- correct, and not to be "fixed" by
 * widening this gate to the host.
 *
 * When the action lands, call it as a member expression
 * (`Engine.controllerMessenger.call(...)`, as `socialFeedQueries` does) so the
 * messenger keeps its `this` binding; aliasing `.call` into a local detaches
 * it and breaks action lookup.
 */
export const fetchTokenHoldersPage = async (
  _assetId: CaipAssetType,
  _options: TokenHoldersPageOptions,
): Promise<FeedResponse> => {
  if (!__DEV__) {
    return EMPTY_PAGE;
  }
  // The fixture is not filtered by `followedByMe`: who the viewer follows is
  // a server-side join, and inventing one here would read as real.
  return TOKEN_HOLDERS_FIXTURE;
};

/** True while rows come from {@link TOKEN_HOLDERS_FIXTURE} rather than the API. */
export const isTokenHoldersFixtureData = (): boolean => __DEV__;

/**
 * react-query only stops paginating on `undefined`; guard the empty cursor so
 * an exhausted list doesn't loop back to the first page.
 */
export const getTokenHoldersNextPageParam = (
  lastPage: FeedResponse,
): string | undefined => lastPage.pagination?.olderCursor ?? undefined;
