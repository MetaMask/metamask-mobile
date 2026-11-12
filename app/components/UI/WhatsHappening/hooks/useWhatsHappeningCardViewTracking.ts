import { useCallback, useEffect, useRef } from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import {
  WHATS_HAPPENING_CAROUSEL_SCROLL_EVENT_THROTTLE,
  type WhatsHappeningSourceValue,
} from '../constants';
import { getWhatsHappeningEventProps } from '../eventProperties';
import type { WhatsHappeningItem } from '../types';
import { isWhatsHappeningCardVisible } from '../util/carouselVisibility';

interface UseWhatsHappeningCardViewTrackingParams {
  items: readonly WhatsHappeningItem[];
  source: WhatsHappeningSourceValue;
  /**
   * When false, scroll position is still recorded but no view events fire.
   * Used while the carousel is showing skeletons.
   */
  enabled: boolean;
}

interface WhatsHappeningCarouselViewHandlers {
  onCarouselLayout: (event: LayoutChangeEvent) => void;
  onCarouselScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle: number;
}

/**
 * Fires `Whats Happening Card Scrolled to View` from the carousel's own
 * scroll position. One handler covers every card, so off-screen cards do not
 * each poll `measureInWindow`.
 *
 * A card fires once per mount, and only when at least half of its width
 * overlaps the carousel viewport. Layout covers cards visible at rest,
 * including when the feed arrives after the carousel has already laid out.
 */
export const useWhatsHappeningCardViewTracking = ({
  items,
  source,
  enabled,
}: UseWhatsHappeningCardViewTrackingParams): WhatsHappeningCarouselViewHandlers => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const seenCardIdsRef = useRef(new Set<string>());
  const viewportWidthRef = useRef(0);
  const offsetXRef = useRef(0);
  const itemsRef = useRef(items);
  const sourceRef = useRef(source);
  const enabledRef = useRef(enabled);
  const trackEventRef = useRef(trackEvent);
  const createEventBuilderRef = useRef(createEventBuilder);

  itemsRef.current = items;
  sourceRef.current = source;
  enabledRef.current = enabled;
  trackEventRef.current = trackEvent;
  createEventBuilderRef.current = createEventBuilder;

  const reportVisibleCards = useCallback(
    (offsetX: number, viewportWidth: number) => {
      if (!enabledRef.current || viewportWidth <= 0) {
        return;
      }

      itemsRef.current.forEach((item, index) => {
        if (seenCardIdsRef.current.has(item.id)) {
          return;
        }

        if (!isWhatsHappeningCardVisible(index, offsetX, viewportWidth)) {
          return;
        }

        seenCardIdsRef.current.add(item.id);
        trackEventRef.current(
          createEventBuilderRef
            .current(MetaMetricsEvents.WHATS_HAPPENING_CARD_SCROLLED_TO_VIEW)
            .addProperties(
              getWhatsHappeningEventProps(item, index, sourceRef.current),
            )
            .build(),
        );
      });
    },
    [],
  );

  const onCarouselLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const width = event.nativeEvent.layout.width;
      viewportWidthRef.current = width;
      reportVisibleCards(offsetXRef.current, width);
    },
    [reportVisibleCards],
  );

  const onCarouselScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const measuredWidth = event.nativeEvent.layoutMeasurement?.width ?? 0;
      offsetXRef.current = offsetX;
      if (measuredWidth > 0) {
        viewportWidthRef.current = measuredWidth;
      }
      reportVisibleCards(
        offsetX,
        measuredWidth > 0 ? measuredWidth : viewportWidthRef.current,
      );
    },
    [reportVisibleCards],
  );

  useEffect(() => {
    reportVisibleCards(offsetXRef.current, viewportWidthRef.current);
  }, [enabled, items, reportVisibleCards]);

  return {
    onCarouselLayout,
    onCarouselScroll,
    scrollEventThrottle: WHATS_HAPPENING_CAROUSEL_SCROLL_EVENT_THROTTLE,
  };
};
