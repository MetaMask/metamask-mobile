import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  View,
} from 'react-native';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { useViewportTracking } from '../../MarketInsights/hooks/useViewportTracking';
import {
  WHATS_HAPPENING_CARD_VISIBILITY_THRESHOLD,
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
  sectionRef: RefObject<View | null>;
  onCarouselLayout: (event: LayoutChangeEvent) => void;
  onCarouselScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle: number;
}

/**
 * Fires `Whats Happening Card Scrolled to View` from the carousel scroll
 * position. One handler covers every card.
 *
 * A card fires once per mount, and only when both of these are true:
 * the section row is at least half on screen, and the card overlaps the
 * carousel viewport by at least half its width.
 *
 * Vertical entry uses one `useViewportTracking` poll on the section. That
 * poll stops once the row is visible. Horizontal position comes from the
 * carousel's own scroll offset, with no per-card measurement.
 */
export const useWhatsHappeningCardViewTracking = ({
  items,
  source,
  enabled,
}: UseWhatsHappeningCardViewTrackingParams): WhatsHappeningCarouselViewHandlers => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const seenCardIdsRef = useRef(new Set<string>());
  const sectionVisibleRef = useRef(false);
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

  const reportVisibleCards = useCallback(() => {
    if (
      !sectionVisibleRef.current ||
      !enabledRef.current ||
      viewportWidthRef.current <= 0
    ) {
      return;
    }

    const offsetX = offsetXRef.current;
    const viewportWidth = viewportWidthRef.current;

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
  }, []);

  const handleSectionVisible = useCallback(() => {
    sectionVisibleRef.current = true;
    reportVisibleCards();
  }, [reportVisibleCards]);

  const { ref: sectionRef, onLayout: onVerticalLayout } = useViewportTracking(
    handleSectionVisible,
    WHATS_HAPPENING_CARD_VISIBILITY_THRESHOLD,
    { source: 'unknown', stage: 'entry_card', emitTrace: false },
  );

  const onCarouselLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const width = event.nativeEvent.layout.width;
      if (width > 0) {
        viewportWidthRef.current = width;
      }
      onVerticalLayout();
      // The vertical hook reports visibility once. A nested ScrollView can
      // lay out at width 0 first, so a later layout with a real width must
      // count the cards already on screen.
      reportVisibleCards();
    },
    [onVerticalLayout, reportVisibleCards],
  );

  const onCarouselScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const measuredWidth = event.nativeEvent.layoutMeasurement?.width ?? 0;
      offsetXRef.current = offsetX;
      if (measuredWidth > 0) {
        viewportWidthRef.current = measuredWidth;
      }
      reportVisibleCards();
    },
    [reportVisibleCards],
  );

  useEffect(() => {
    reportVisibleCards();
  }, [enabled, items, reportVisibleCards]);

  return {
    sectionRef,
    onCarouselLayout,
    onCarouselScroll,
    scrollEventThrottle: WHATS_HAPPENING_CAROUSEL_SCROLL_EVENT_THROTTLE,
  };
};
