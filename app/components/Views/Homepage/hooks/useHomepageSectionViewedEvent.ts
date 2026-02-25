import { useCallback, useEffect, useRef, RefObject } from 'react';
import type { View } from 'react-native';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { useHomepageScrollContext } from '../context/HomepageScrollContext';

export const HomepageSectionNames = {
  TOKENS: 'tokens',
  PERPS: 'perps',
  DEFI: 'defi',
  PREDICT: 'predict',
  NFTS: 'nfts',
} as const;

export type HomepageSectionName =
  (typeof HomepageSectionNames)[keyof typeof HomepageSectionNames];

interface UseHomepageSectionViewedEventParams {
  /**
   * Ref to the section's root View. Pass `null` when the section does not
   * render (e.g. DeFi with no positions) — the event will fire immediately
   * once `isLoading` is false.
   */
  sectionRef: RefObject<View> | null;
  /** Whether the section data is still being fetched. */
  isLoading: boolean;
  sectionName: HomepageSectionName;
  /** 0-based position of this section among all enabled sections. */
  sectionIndex: number;
  /** Total number of enabled sections on the page. */
  totalSectionsLoaded: number;
  /** True when the section is in empty / placeholder state. */
  isEmpty: boolean;
  /**
   * Number of items shown, regardless of empty or filled state.
   * E.g. for Tokens: number of token rows. For NFTs in empty state: 0.
   */
  itemCount: number;
}

/**
 * Fires a `Homepage Viewed` Segment event when a homepage section enters the
 * user's viewport (≥ 50 % of the section is visible).
 *
 * - Re-fires on every homepage visit (when `visitId` increments).
 * - For sections that do not render (e.g. DeFi with no positions), fires
 * immediately once loading has finished (when `sectionRef` is `null`).
 * - Uses a subscription pattern instead of React state so scroll events do
 * not trigger re-renders of section components.
 */
const useHomepageSectionViewedEvent = ({
  sectionRef,
  isLoading,
  sectionName,
  sectionIndex,
  totalSectionsLoaded,
  isEmpty,
  itemCount,
}: UseHomepageSectionViewedEventParams) => {
  const {
    subscribeToScroll,
    viewportHeight,
    containerScreenY,
    entryPoint,
    visitId,
  } = useHomepageScrollContext();

  const { trackEvent, createEventBuilder } = useAnalytics();

  const hasFiredRef = useRef(false);

  const fireEvent = useCallback(() => {
    if (hasFiredRef.current) return;
    // Wallet initializes visitId to 0 and useFocusEffect sets it to 1 on first
    // focus. Child effects run before parent effects, so sections can run with
    // visitId=0 and fire; then the focus effect runs, visitId becomes 1, the
    // reset effect clears hasFiredRef, and the event fires again. Skip firing
    // when visitId is 0 so we only fire after the homepage has been focused.
    if (visitId === 0) return;
    // sectionIndex is -1 when the section's feature flag is OFF and it is
    // not included in enabledSections. Don't fire the event in that case.
    if (sectionIndex < 0) return;
    hasFiredRef.current = true;

    trackEvent(
      createEventBuilder(MetaMetricsEvents.HOMEPAGE_SECTION_VIEWED)
        .addProperties({
          interaction_type: 'section_viewed',
          location: 'home',
          name: sectionName,
          index: sectionIndex,
          total_sections_loaded: totalSectionsLoaded,
          is_empty: isEmpty,
          item_count: itemCount,
          entry_point: entryPoint,
        })
        .build(),
    );
  }, [
    visitId,
    sectionName,
    sectionIndex,
    totalSectionsLoaded,
    isEmpty,
    itemCount,
    entryPoint,
    trackEvent,
    createEventBuilder,
  ]);

  // Reset on each homepage visit so the event re-fires.
  useEffect(() => {
    hasFiredRef.current = false;
  }, [visitId]);

  // For sections that do NOT render (empty / error / disabled): fire once
  // loading is done, since there is no View to measure.
  // visitId is included so this effect re-runs on each homepage visit, allowing
  // the event to re-fire after hasFiredRef is reset by the effect above.
  useEffect(() => {
    if (sectionRef !== null || isLoading) return;
    fireEvent();
  }, [sectionRef, isLoading, fireEvent, visitId]);

  // For sections that DO render: check viewport visibility on mount and on
  // every scroll event. Uses subscribeToScroll so no React re-renders occur
  // during scrolling.
  useEffect(() => {
    if (!sectionRef?.current || viewportHeight === 0) return;

    const checkVisibility = () => {
      if (hasFiredRef.current) return;
      sectionRef.current?.measureInWindow((_x, y, _width, height) => {
        if (height === 0) return;
        // measureInWindow returns absolute screen coordinates. The visible
        // bounds of the scroll container are [containerScreenY,
        // containerScreenY + viewportHeight], not [0, viewportHeight].
        const viewportTop = containerScreenY;
        const viewportBottom = containerScreenY + viewportHeight;
        const visiblePx =
          Math.min(y + height, viewportBottom) - Math.max(y, viewportTop);
        if (visiblePx >= height * 0.5) {
          fireEvent();
        }
      });
    };

    // Initial check (covers sections already in viewport on mount/revisit).
    checkVisibility();

    // Subscribe to subsequent scroll events.
    const unsubscribe = subscribeToScroll(checkVisibility);
    return unsubscribe;
  }, [
    visitId,
    viewportHeight,
    containerScreenY,
    sectionRef,
    subscribeToScroll,
    fireEvent,
  ]);
};

export default useHomepageSectionViewedEvent;
