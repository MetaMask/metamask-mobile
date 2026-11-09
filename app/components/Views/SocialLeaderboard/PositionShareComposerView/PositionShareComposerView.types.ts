import type { Position } from '@metamask/social-controllers';

export interface PositionShareComposerViewParams {
  position: Position;
  traderId: string;
  traderName: string;
  traderImageUrl?: string;
  traderAddress?: string;
  /** Authoritative open/closed flag from the caller, when it has one. */
  isClosed?: boolean;
  /** Analytics source forwarded from the screen that opened the composer. */
  source?: string;
}
