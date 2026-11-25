import type { FeedItem } from '@metamask/social-controllers';
import type { CaipAssetType } from '@metamask/utils';
import AppConstants from '../../../../../../core/AppConstants';
import Engine from '../../../../../../core/Engine';

/**
 * One page of holders.
 *
 * Shaped like a feed response -- the route returns positions with the trader
 * attached -- but it pages by number and reports `hasMore` rather than
 * handing back a cursor, so it is not a `FeedResponse`.
 */
export interface TokenHoldersPage {
  items: FeedItem[];
  pagination?: { hasMore?: boolean };
}

/** What a build whose API has no holders route reports: no rows, no more. */
export const EMPTY_HOLDERS_PAGE: TokenHoldersPage = {
  items: [],
  pagination: { hasMore: false },
};

export interface TokenHoldersPageOptions {
  /** 1-based page number. The route has no page-size parameter. */
  page?: number;
  /** Cancels the request when react-query drops the page. */
  signal?: AbortSignal;
}

export type TokenHoldersQueryKey = [
  'TokenDetailsHolders',
  CaipAssetType | undefined,
];

/** `['TokenDetailsHolders', assetId]` -- one list per token. */
export const buildTokenHoldersQueryKey = (
  assetId: CaipAssetType | undefined,
): TokenHoldersQueryKey => ['TokenDetailsHolders', assetId];

/**
 * The asset id is percent-encoded: a CAIP-19 carries a `/`, and the route
 * reads a raw one as another path segment and answers 404.
 */
export const tokenHoldersUrl = (
  assetId: CaipAssetType,
  { page }: Pick<TokenHoldersPageOptions, 'page'> = {},
): string => {
  const base = AppConstants.SOCIAL_API_URL.replace(/\/$/, '');
  const query = page && page > 1 ? `?page=${page}` : '';
  return `${base}/api/v1/positions/${encodeURIComponent(assetId)}${query}`;
};

/**
 * The viewer's bearer token, as every other social GET sends it.
 *
 * Called as a member expression so the messenger keeps its `this` binding.
 * The route is public, and social sends the header on its public GETs too so
 * the server can tell who is asking; a signed-out viewer therefore gets no
 * header rather than no request.
 */
const authorizationHeaders = async (): Promise<Record<string, string>> => {
  try {
    const token = await Engine.controllerMessenger.call(
      'AuthenticationController:getBearerToken',
    );
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
};

/**
 * Fetches one page of the traders holding a token.
 *
 * `GET /api/v1/positions/:assetId` -- every holder of the token. The
 * follow-scoped `/followed-by-me` variant is deliberately not used here; it
 * lands with its toggle in a separate PR. Called directly rather than
 * through the messenger because `@metamask/social-controllers` still
 * exposes no action for this route -- the same reason
 * `traderPositionService` builds its own URLs.
 *
 * A 404 means this build's cluster does not serve the route yet (it is live
 * on dev, not on prod) and reports no holders rather than an error: an empty
 * list hides the tab, while an error would leave it showing a retry for
 * something that cannot succeed.
 */
export const fetchTokenHoldersPage = async (
  assetId: CaipAssetType,
  options: TokenHoldersPageOptions,
): Promise<TokenHoldersPage> => {
  const response = await fetch(tokenHoldersUrl(assetId, options), {
    headers: await authorizationHeaders(),
    signal: options.signal,
  });

  if (response.status === 404) {
    return EMPTY_HOLDERS_PAGE;
  }
  if (!response.ok) {
    throw new Error(`Holders request failed with status ${response.status}`);
  }

  const body: unknown = await response.json();
  const page = body as TokenHoldersPage | null;
  return {
    items: Array.isArray(page?.items) ? page.items : [],
    pagination: page?.pagination,
  };
};

/**
 * The route pages by number and says whether another page exists; returning
 * `undefined` is what stops react-query asking for one.
 */
export const getTokenHoldersNextPageParam = (
  lastPage: TokenHoldersPage,
  allPages: TokenHoldersPage[],
): number | undefined =>
  lastPage.pagination?.hasMore === true ? allPages.length + 1 : undefined;
