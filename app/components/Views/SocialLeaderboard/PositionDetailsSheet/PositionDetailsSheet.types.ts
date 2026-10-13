import type { Position } from '@metamask/social-controllers';
import type { SocialV1FeedAuthor } from '../../../UI/SocialFeed/types';

export interface PositionDetailsSheetParams {
  /** Used to fetch the position when the caller has no `position` snapshot. */
  positionId: string;
  /** Snapshot from the tapped card. Renders immediately, no fetch fires. */
  position?: Position;
  author: SocialV1FeedAuthor;
  /** Post message. Trades (Live trades) have none, so the section is hidden. */
  comment?: string;
  /** Authoritative open/closed flag from the caller, when it has one. */
  isClosed?: boolean;
}
