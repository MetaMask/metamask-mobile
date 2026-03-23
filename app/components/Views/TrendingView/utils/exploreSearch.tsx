import React, { useRef } from 'react';
import { View } from 'react-native';
import type { IMetaMetricsEvent } from '../../../../core/Analytics/MetaMetrics.types';
import { analytics } from '../../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';

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
    <View
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
    </View>
  );
};

/**
 * Thin wrapper around the analytics event builder pattern.
 * Reduces the 5-line boilerplate at every call site to a single line.
 */
export const trackExploreEvent = (
  event: IMetaMetricsEvent,
  properties: Record<string, string>,
): void => {
  analytics.trackEvent(
    AnalyticsEventBuilder.createEventBuilder(event)
      .addProperties(properties)
      .build(),
  );
};
