import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { LayoutChangeEvent, NativeScrollEvent } from 'react-native';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { PERPS_EVENT_PROPERTY } from '@metamask/perps-controller';
import { usePerpsEventTracking } from './usePerpsEventTracking';
import {
  PERPS_MARKET_ABOUT_EVENT_PROPERTY,
  PERPS_MARKET_ABOUT_INTERACTION_TYPE,
  PERPS_MARKET_ABOUT_VISIBILITY_THRESHOLD,
} from '../components/PerpsMarketAboutSection/PerpsMarketAboutSection.constants';

export interface UsePerpsMarketAboutTrackingParams {
  /**
   * Market symbol (e.g. 'BTC', 'NVDA', 'CL'). Also acts as the screen-session
   * key: changing symbol resets the one-shot "viewed" tracking.
   */
  symbol?: string;
  /**
   * Market asset classification (e.g. 'crypto', 'stock', 'commodity', 'forex').
   */
  marketType?: string;
  /**
   * Raw description string from the market metadata.
   */
  description?: string;
}

export interface UsePerpsMarketAboutTrackingResult {
  /**
   * Whether a non-empty description exists (i.e. the section should render).
   */
  hasDescription: boolean;
  /**
   * onLayout handler for the About section container. Captures the section's
   * position within the scroll content so viewport visibility can be computed.
   */
  handleAboutLayout: (event: LayoutChangeEvent) => void;
  /**
   * onScroll handler for the scroll container. Fires the "viewed" event at most
   * once per screen session when the section scrolls into the viewport.
   */
  handleAboutScroll: (event: { nativeEvent: NativeScrollEvent }) => void;
}

/**
 * Tracks analytics for the market About section.
 *
 * `market_about_section_displayed` fires once when the section is rendered
 * because a non-empty description is available (AC4).
 *
 * `market_about_section_viewed` fires once per screen session when the section
 * scrolls into the viewport (AC5).
 */
export function usePerpsMarketAboutTracking({
  symbol,
  marketType,
  description,
}: UsePerpsMarketAboutTrackingParams): UsePerpsMarketAboutTrackingResult {
  const { track } = usePerpsEventTracking();

  const trimmedDescription = description?.trim() ?? '';
  const hasDescription = trimmedDescription.length > 0;

  // Section layout in scroll-content coordinates (matches contentOffset space).
  const layoutRef = useRef<{ top: number; height: number } | null>(null);
  // One-shot guard for the "viewed" event, scoped to the screen session.
  const viewedTrackedRef = useRef(false);

  // Reset per-session state whenever the market (screen session) changes.
  useEffect(() => {
    viewedTrackedRef.current = false;
    layoutRef.current = null;
  }, [symbol]);

  const baseProperties = useMemo(
    () => ({
      [PERPS_MARKET_ABOUT_EVENT_PROPERTY.MARKET_SYMBOL]: symbol,
      [PERPS_MARKET_ABOUT_EVENT_PROPERTY.MARKET_TYPE]: marketType ?? 'crypto',
      [PERPS_MARKET_ABOUT_EVENT_PROPERTY.DESCRIPTION_LENGTH]:
        trimmedDescription.length,
    }),
    [symbol, marketType, trimmedDescription.length],
  );

  // AC4 — fire "displayed" once when the section renders with a description.
  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_UI_INTERACTION,
    conditions: [hasDescription],
    resetKey: symbol,
    properties: {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_MARKET_ABOUT_INTERACTION_TYPE.DISPLAYED,
      ...baseProperties,
    },
  });

  const handleAboutLayout = useCallback((event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    if (height === 0) {
      layoutRef.current = null;
      return;
    }
    layoutRef.current = { top: y, height };
  }, []);

  const handleAboutScroll = useCallback(
    (event: { nativeEvent: NativeScrollEvent }) => {
      if (!hasDescription || viewedTrackedRef.current) {
        return;
      }

      const layout = layoutRef.current;
      if (!layout) {
        return;
      }

      const { contentOffset, layoutMeasurement } = event.nativeEvent;
      const viewportBottom = contentOffset.y + layoutMeasurement.height;
      const visibleThreshold =
        layout.top + layout.height * PERPS_MARKET_ABOUT_VISIBILITY_THRESHOLD;

      if (viewportBottom >= visibleThreshold) {
        viewedTrackedRef.current = true;
        track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_MARKET_ABOUT_INTERACTION_TYPE.VIEWED,
          ...baseProperties,
        });
      }
    },
    [hasDescription, track, baseProperties],
  );

  return {
    hasDescription,
    handleAboutLayout,
    handleAboutScroll,
  };
}
