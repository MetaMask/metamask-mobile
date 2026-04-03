import React, { useCallback, useRef } from 'react';
import { Box } from '@metamask/design-system-react-native';
import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import { analytics } from '../../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';
import type { SectionConfig } from '../sections.config';

/**
 * Minimum vertical movement (in pixels) to consider a touch gesture a scroll
 * rather than a tap. Absorbs micro-jitter from real taps while staying far
 * below any intentional scroll distance.
 */
const SCROLL_THRESHOLD = 8;

/**
 * Wraps children and fires `onTap` only when the touch ends without a scroll
 * gesture. Uses raw touch events (onTouchStart/Move/End) which fire
 * independently of the scroll responder system, so movement is reliably
 * detected even while a parent FlashList is absorbing a scroll.
 */
export const TapView: React.FC<{
  onTap?: () => void;
  children: React.ReactNode;
}> = ({ onTap, children }) => {
  const startY = useRef(0);
  const didScroll = useRef(false);
  return (
    <Box
      onTouchStart={(e) => {
        startY.current = e.nativeEvent.pageY;
        didScroll.current = false;
      }}
      onTouchMove={(e) => {
        if (Math.abs(e.nativeEvent.pageY - startY.current) > SCROLL_THRESHOLD) {
          didScroll.current = true;
        }
      }}
      onTouchEnd={() => {
        if (!didScroll.current) onTap?.();
      }}
    >
      {children}
    </Box>
  );
};

/**
 * Thin wrapper around the analytics event builder pattern.
 * Reduces the 5-line boilerplate at every call site to a single line.
 */
export const trackExploreEvent = (
  event: Parameters<typeof AnalyticsEventBuilder.createEventBuilder>[0],
  properties: Record<string, string>,
): void => {
  analytics.trackEvent(
    AnalyticsEventBuilder.createEventBuilder(event)
      .addProperties(properties)
      .build(),
  );
};

/**
 * Returns a stable `onScrollBeginDrag` handler that fires a one-shot
 * analytics event the first time the user begins scrolling.
 * Uses a ref for `searchQuery` so the callback identity never changes.
 */
export const useScrollTracking = (
  interactionType: string,
  searchQuery: string,
  extraProperties?: Record<string, string>,
) => {
  const hasTracked = useRef(false);
  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;

  const extraPropsRef = useRef(extraProperties);
  extraPropsRef.current = extraProperties;

  const onScrollBeginDrag = useCallback(() => {
    if (hasTracked.current) return;
    hasTracked.current = true;
    trackExploreEvent(MetaMetricsEvents.EXPLORE_SEARCH_INTERACTED, {
      interaction_type: interactionType,
      search_query: searchQueryRef.current,
      ...extraPropsRef.current,
    });
  }, [interactionType]);

  const resetScrollTracking = useCallback(() => {
    hasTracked.current = false;
  }, []);

  return { onScrollBeginDrag, resetScrollTracking };
};

interface TrackedRowItemProps {
  section: SectionConfig;
  item: unknown;
  index: number;
  searchQuery: string;
  interactionType: string;
}

/**
 * Renders a section RowItem (or its search override) wrapped in a TapView
 * that fires an analytics event on tap with the item identifier.
 */
export const TrackedRowItem: React.FC<TrackedRowItemProps> = ({
  section,
  item,
  index,
  searchQuery,
  interactionType,
}) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const RowComponent = section.OverrideRowItemSearch ?? section.RowItem;

  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;

  const handleItemTouch = useCallback(() => {
    trackExploreEvent(MetaMetricsEvents.EXPLORE_SEARCH_INTERACTED, {
      interaction_type: interactionType,
      search_query: searchQueryRef.current,
      section_name: section.title,
      item_clicked: section.getItemIdentifier(item),
    });
  }, [interactionType, section, item]);

  return (
    <TapView onTap={handleItemTouch}>
      <RowComponent item={item} index={index} navigation={navigation} />
    </TapView>
  );
};
