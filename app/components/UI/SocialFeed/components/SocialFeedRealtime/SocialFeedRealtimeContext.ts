import { createContext, useContext } from 'react';

/** Realtime state a virtualized `SocialFeed` shares with its header. */
export interface SocialFeedRealtimeContextValue {
  /** Mirrors the feed's `paused` prop. */
  paused: boolean;
  /** New posts held back. Always 0 without realtime. */
  pendingNewCount: number;
}

export const SocialFeedRealtimeContext =
  createContext<SocialFeedRealtimeContextValue | null>(null);

/** Null outside a virtualized `SocialFeed`. */
export const useSocialFeedRealtime = () =>
  useContext(SocialFeedRealtimeContext);
