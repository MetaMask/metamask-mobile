import type { Position } from '@metamask/social-controllers';

/**
 * The id of one card on the all and trending feeds, where a position can
 * surface several times (its trade and each comment on it). Absent on the
 * other scopes, which have one card per position.
 *
 * `@metamask/social-controllers` does not type `feedItemId` yet.
 */
export const readFeedItemId = (position: Position): string | undefined =>
  (position as Position & { feedItemId?: string }).feedItemId;

/** Identifies one card of any feed: its feed item, else its position. */
export const getFeedItemId = (position: Position): string =>
  readFeedItemId(position) ?? position.positionId;
