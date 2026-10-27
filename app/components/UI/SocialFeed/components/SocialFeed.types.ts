import type React from 'react';
import type { ScrollHandlerProcessed } from 'react-native-reanimated';
import type { SocialFeedSource } from '../data/socialFeedSource';
import type { SocialSurfaceLocation } from '../SocialFeedSurface';
import type { SocialFeedPageHandle, SocialV1FeedPost } from '../types';
import type { SocialEventSource } from '../../../Views/SocialLeaderboard/analytics/socialEvents';
import type { SocialFeedPostShellProps } from './SocialFeedPostShell';

/**
 * Who scrolls the feed. `content` renders inside the host's scroll view;
 * `virtualized` owns a list, which realtime needs to stay smooth.
 */
export type SocialFeedScrollMode = 'content' | 'virtualized';

export interface SocialFeedHeaderProps {
  /** New posts waiting behind a pill. Always 0 without realtime. */
  pendingNewCount: number;
  /** Shows the waiting posts and scrolls to the top. A no-op without realtime. */
  onRevealPending: () => void;
}

interface SocialFeedBaseProps {
  /** Which slice to load. The component fetches it; the host does not. */
  source: SocialFeedSource;
  /** Where this feed is shown. Post events use it; the host does not track. */
  location: SocialSurfaceLocation;
  /** Entry point when it is not already implied by `location`. */
  analyticsSource?: SocialEventSource;
  /** Inactive tabs wait to record the screen view. Defaults to active. */
  isActive?: boolean;
  /** Optional heading above the posts. */
  title?: string;
  /** Rendered below the title, scrolling with the posts. */
  renderHeader?: (props: SocialFeedHeaderProps) => React.ReactNode;
  /** Keeps only matching posts, realtime ones included. Memoize it. */
  filterPost?: (post: SocialV1FeedPost) => boolean;
  onAuthorPress?: (post: SocialV1FeedPost) => void;
  onCopyTrade?: SocialFeedPostShellProps['onCopyTrade'];
  onPositionPress?: (post: SocialV1FeedPost) => void;
  testID?: string;
}

export interface SocialFeedContentProps extends SocialFeedBaseProps {
  scrollMode?: 'content';
}

export interface SocialFeedVirtualizedProps extends SocialFeedBaseProps {
  scrollMode: 'virtualized';
  /** Streams new posts in. Ignored for sources without a socket channel. */
  realtime?: boolean;
  /** Holds new posts behind `pendingNewCount`. */
  paused?: boolean;
  /** Host scroll handler, composed with the feed's own. */
  onScroll?: ScrollHandlerProcessed;
  pageRef?: React.Ref<SocialFeedPageHandle>;
  scrollTestID?: string;
}

export type SocialFeedProps =
  | SocialFeedContentProps
  | SocialFeedVirtualizedProps;
