import type { Position } from '@metamask/social-controllers';
import type { SocialV1FeedAuthor } from '../../../UI/SocialFeed/types';
import type { SocialEventSource } from '../analytics';

export interface PositionDetailsSheetParams {
  /** Used to fetch the position when the snapshot may be stale or missing. */
  positionId: string;
  /** Snapshot from the tapped card. Renders immediately. */
  position?: Position;
  author: SocialV1FeedAuthor;
  /** Authoritative open/closed flag from the caller, when it has one. */
  isClosed?: boolean;
  /**
   * True when the caller's feed was streaming revisions for the snapshot.
   * Anything else makes the sheet fetch the position on open.
   */
  isSnapshotLive?: boolean;
  /**
   * Quick Buy `source` and Perps order source for a sheet opened from a feed
   * tab. Profile and follow events keep their existing source.
   */
  orderSource?: 'social_trending' | 'social_following' | 'social_live_trades';
  /** Shows the share button and attributes shares to this source. */
  shareSource?: SocialEventSource;
}
