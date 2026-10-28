import type React from 'react';
import type { ScrollHandlerProcessed } from 'react-native-reanimated';
import type { SocialFeedQuery } from '../data/socialFeedSource';
import type { SocialSurfaceLocation } from '../SocialFeedSurface';
import type { SocialFeedPageHandle, SocialV1FeedPost } from '../types';
import type { SocialEventSource } from '../../../Views/SocialLeaderboard/analytics/socialEvents';
import type {
  SocialDataFetchTab,
  SocialPerformanceContext,
} from '../../../../util/social/socialPerformance';
import type { SocialFeedPostShellProps } from './SocialFeedPostShell';

/**
 * Who scrolls the feed. `content` renders inside the host's scroll view;
 * `virtualized` owns a list, which realtime needs to stay smooth.
 */
export type SocialFeedScrollMode = 'content' | 'virtualized';

/** A host row spliced into the list between posts. */
export interface SocialFeedInlineRow {
  /** Unique among the feed's inline rows. */
  key: string;
  /** Posts shown above this row. Past the last post, the row follows it. */
  afterIndex: number;
  render: () => React.ReactNode;
}

/**
 * The query fields (`scope`, `chains`, `assetIds`, `profileId`,
 * `commentedOnly`) say which slice to load, as `SocialService:fetchFeed`
 * takes them. The component fetches it; the host does not. Memoize the arrays.
 */
interface SocialFeedBaseProps extends SocialFeedQuery {
  /** Where this feed is shown. Post events use it; the host does not track. */
  location: SocialSurfaceLocation;
  /** Entry point when it is not already implied by `location`. */
  analyticsSource?: SocialEventSource;
  /**
   * Shows the invented values posts still carry. Omitted keeps the outer
   * surface's choice.
   */
  showMockedFields?: boolean;
  /** Inactive tabs wait to record the screen view. Defaults to active. */
  isActive?: boolean;
  /** Optional heading above the posts. */
  title?: string;
  /**
   * Rendered below the title, scrolling with the posts. In virtualized mode it
   * can hold `SocialFeedLiveButton`.
   */
  renderHeader?: () => React.ReactNode;
  /** Keeps only matching posts, realtime ones included. Memoize it. */
  filterPost?: (post: SocialV1FeedPost) => boolean;
  /** Replaces the default empty line when the filtered feed has no posts. */
  emptyState?: React.ReactNode;
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
  /**
   * Streams new posts in. Ignored for sources without a socket channel. Held
   * posts show a floating "N new posts" pill that reveals them.
   */
  realtime?: boolean;
  /** Holds new posts back; switching back to false reveals them. */
  paused?: boolean;
  /**
   * Host rows between posts, hidden while the first page loads. With no
   * posts they follow the empty state. Memoize the array.
   */
  inlineRows?: readonly SocialFeedInlineRow[];
  /** Called when the user pulls to refresh, for host analytics. */
  onRefresh?: () => void;
  /** Social V1 tab traces: the initial fetch and the first content. */
  performance?: Readonly<{
    tab: SocialDataFetchTab;
    context: SocialPerformanceContext;
  }>;
  /** Host scroll handler, composed with the feed's own. */
  onScroll?: ScrollHandlerProcessed;
  pageRef?: React.Ref<SocialFeedPageHandle>;
  scrollTestID?: string;
}

export type SocialFeedProps =
  | SocialFeedContentProps
  | SocialFeedVirtualizedProps;
