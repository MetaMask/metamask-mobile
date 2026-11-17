import type { Position } from '@metamask/social-controllers';

/**
 * Response types for the Social API endpoint
 * `GET /v1/positions/{assetId}/followed-by-me`.
 *
 * Returns the largest OPEN positions in a token among the traders the
 * authenticated user follows, one page (20) at a time, each position carrying
 * its `actor` (the trader) and `trades`. These types are defined here (not
 * imported from `@metamask/social-controllers`) because the package does not
 * expose the endpoint yet. Prefer the package's exported types once a
 * `SocialService` action lands upstream.
 *
 * NOTE: this replaced the earlier `/v1/tokens/{assetId}/following-positions`
 * route from va-mmcx-social-api PR #398, which was folded into the shared
 * `positions` controller (commit `f306ac2`).
 */

/** The trader attached to a position (`actor`). `imageUrl` is the avatar. */
export interface FollowingPositionActor {
  profileId: string;
  address: string;
  name: string;
  /** Small avatar URL. Optional — some traders have no image set. */
  imageUrl?: string | null;
}

/**
 * One followed trader's open position in the token. Mirrors the API's
 * `FeedItemDto` (an enriched position with its `actor`); only the fields the
 * chart markers consume are modelled, plus the full `Position` trade shape.
 */
export interface FollowingPositionItem extends Position {
  actor: FollowingPositionActor;
}

/** Page-based pagination (`PositionsPaginationDto`). */
export interface FollowingPositionsPagination {
  hasMore: boolean;
  /** Next page number, present when `hasMore` is true. */
  nextPage?: number;
}

export interface FollowingTokenPositionsResponse {
  items: FollowingPositionItem[];
  pagination: FollowingPositionsPagination;
}

/**
 * Args for the (future) SocialService action. A `type` alias (not an
 * `interface`) so it stays assignable to the Json-shaped query-key tuple that
 * `@metamask/react-data-query` expects.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type FetchFollowingTokenPositionsOptions = {
  /** CAIP-19 asset id (the SocialService client percent-encodes it). */
  assetId: string;
  /** 1-based page. Omitted => first page. */
  page?: number;
};
