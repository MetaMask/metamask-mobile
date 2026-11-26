import React, { forwardRef } from 'react';
import type { ScrollView } from 'react-native';
import ConditionalScrollView from '../ConditionalScrollView';
import PullToRefresh from './PullToRefresh';
import type { PullToRefreshScrollViewProps } from './PullToRefresh.types';

/**
 * Convenience `ScrollView` wrapper around `PullToRefresh` for screens that
 * render a standard `ScrollView` rather than a virtualized list.
 */
const PullToRefreshScrollView = forwardRef<
  ScrollView,
  PullToRefreshScrollViewProps
>(
  (
    {
      children,
      refreshing,
      onRefresh,
      indicatorTopInset,
      refreshControlTopInset,
      indicatorBottomInset,
      scrollY,
      topScrollOffset,
      isActive,
      refreshingAnnouncement,
      updatedAnnouncement,
      scrollViewProps,
    },
    ref,
  ) => (
    <PullToRefresh
      refreshing={refreshing}
      onRefresh={onRefresh}
      indicatorTopInset={indicatorTopInset}
      refreshControlTopInset={refreshControlTopInset}
      indicatorBottomInset={indicatorBottomInset}
      scrollY={scrollY}
      topScrollOffset={topScrollOffset}
      isActive={isActive}
      onScroll={scrollViewProps.onScroll}
      bounces={scrollViewProps.bounces}
      overScrollMode={scrollViewProps.overScrollMode}
      accessibilityActions={scrollViewProps.accessibilityActions}
      accessibilityState={scrollViewProps.accessibilityState}
      onAccessibilityAction={scrollViewProps.onAccessibilityAction}
      refreshingAnnouncement={refreshingAnnouncement}
      updatedAnnouncement={updatedAnnouncement}
    >
      {({ scrollProps, refreshControl }) => (
        <ConditionalScrollView
          ref={ref}
          isScrollEnabled
          scrollViewProps={{
            ...scrollViewProps,
            ...scrollProps,
            refreshControl,
          }}
        >
          {children}
        </ConditionalScrollView>
      )}
    </PullToRefresh>
  ),
);

PullToRefreshScrollView.displayName = 'PullToRefreshScrollView';

export default PullToRefreshScrollView;
