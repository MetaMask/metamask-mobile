import type React from 'react';
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControlProps,
  ScrollViewProps,
} from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

export type RefreshHandler = () => void | Promise<void>;

export interface PullToRefreshScrollProps {
  /**
   * Scroll handler that tracks scroll offset on the JS thread.
   * Omitted when an external `scrollY` shared value is provided so callers can
   * keep their own Reanimated `useAnimatedScrollHandler`.
   */
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  bounces?: boolean;
  overScrollMode?: ScrollViewProps['overScrollMode'];
  accessibilityActions?: ScrollViewProps['accessibilityActions'];
  accessibilityState?: ScrollViewProps['accessibilityState'];
  onAccessibilityAction?: ScrollViewProps['onAccessibilityAction'];
}

export interface PullToRefreshRenderProps {
  /** Props to spread onto the underlying scrollable (`ScrollView`, `FlashList`, `FlatList`, `SectionList`). */
  scrollProps: PullToRefreshScrollProps;
  /**
   * Native `<RefreshControl>` fallback when Rive is disabled or unavailable,
   * or `undefined` when the custom Fox Rive gesture is active.
   */
  refreshControl: React.ReactElement<RefreshControlProps> | undefined;
  /** Whether the custom Rive pull-to-refresh gesture is currently active. */
  isCustomGestureActive: boolean;
}

export interface PullToRefreshProps {
  /** Render prop receiving scrollable props and the optional native `RefreshControl` fallback. */
  children: (renderProps: PullToRefreshRenderProps) => React.ReactNode;
  refreshing: boolean;
  onRefresh: RefreshHandler;
  indicatorTopInset?: number;
  refreshControlTopInset?: number;
  indicatorBottomInset?: number;
  /**
   * Optional external Reanimated `scrollY` shared value (e.g. from `useAnimatedScrollHandler`).
   * When provided, pull activation reads `scrollY.value` directly on the UI thread
   * and `scrollProps.onScroll` is omitted.
   */
  scrollY?: SharedValue<number>;
  /**
   * Resting `scrollY` value at the top of the scrollable (default `0`).
   * Set to `-contentInsetTop` on iOS scrollables that apply a top `contentInset`.
   */
  topScrollOffset?: number;
  /**
   * Controls whether the Rive indicator and custom pull gesture are active (default `true`).
   * Pass `isFocused` or a pager tab's `isActive` flag so background tabs unmount Rive.
   */
  isActive?: boolean;
  /** Optional caller `onScroll` callback composed when `scrollY` is not supplied. */
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Preserved on the scrollable when falling back to the native `RefreshControl`. */
  bounces?: boolean;
  /** Preserved on the scrollable when falling back to the native `RefreshControl`. */
  overScrollMode?: ScrollViewProps['overScrollMode'];
  accessibilityActions?: ScrollViewProps['accessibilityActions'];
  accessibilityState?: ScrollViewProps['accessibilityState'];
  onAccessibilityAction?: ScrollViewProps['onAccessibilityAction'];
  /** Screen reader announcement when refresh starts (defaults to `strings('common.refreshing')`). */
  refreshingAnnouncement?: string;
  /** Screen reader announcement when refresh finishes (defaults to `strings('common.updated')`). */
  updatedAnnouncement?: string;
}

export interface PullToRefreshScrollViewProps {
  children: React.ReactNode;
  refreshing: boolean;
  onRefresh: RefreshHandler;
  indicatorTopInset?: number;
  refreshControlTopInset?: number;
  indicatorBottomInset?: number;
  scrollY?: SharedValue<number>;
  topScrollOffset?: number;
  isActive?: boolean;
  refreshingAnnouncement?: string;
  updatedAnnouncement?: string;
  scrollViewProps: ScrollViewProps;
}
