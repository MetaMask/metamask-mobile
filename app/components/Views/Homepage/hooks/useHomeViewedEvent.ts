import { useCallback, useEffect, useRef, RefObject } from 'react';
import type { View } from 'react-native';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { useHomepageScrollContext } from '../context/HomepageScrollContext';

export const HomeSectionNames = {
  CASH: 'cash',
  TOKENS: 'tokens',
  WHATS_HAPPENING: 'whats_happening',
  PERPS: 'perps',
  DEFI: 'defi',
  PREDICT: 'predict',
  NFTS: 'nfts',
  TOP_TRADERS: 'top_traders',
  TRENDING_TOKENS: 'trending_tokens',
  TRENDING_PERPS: 'trending_perps',
  TRENDING_PREDICT: 'trending_predict',
} as const;

export type HomeSectionName =
  (typeof HomeSectionNames)[keyof typeof HomeSectionNames];

interface UseHomeViewedEventParams {
  /**
   * Ref to the section's root View. Pass `null` when the section does not
   * render — once `isLoading` is false, the hook may fire immediately (see
   * `fireImmediateWhenNoView`) or not, depending on product rules.
   */
  sectionRef: RefObject<View> | null;
  /** Whether the section data is still being fetched. */
  isLoading: boolean;
  sectionName: HomeSectionName;
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
  /**
   * When `sectionRef` is `null` and loading has finished, fire `HOME_VIEWED`
   * once (e.g. What's Happening with no items still wants an empty impression).
   * Set to `false` when the section is omitted from the UI entirely (e.g. DeFi
   * with no positions).
   * @default true
   */
  fireImmediateWhenNoView?: boolean;
}

/**
 * Fires a `Home Viewed` Segment event when a homepage section enters the
 * user's viewport (≥ 30 % of the section is visible).
 *
 * - Re-fires on every homepage visit (when `visitId` increments).
 * - For sections that do not render but still want an impression (e.g. What's
 * Happening empty), may fire immediately once loading has finished when
 * `sectionRef` is `null` and `fireImmediateWhenNoView` is true (default).
 * - Viewport tracking is deferred until `isLoading` is false so skeletons do not
 * emit section_viewed for content that will be hidden when load completes.
 * - Uses a subscription pattern instead of React state so scroll events do
 * not trigger re-renders of section components.
 */
const useHomeViewedEvent = ({
  sectionRef,
  isLoading,
  sectionName,
  sectionIndex,
  totalSectionsLoaded,
  isEmpty,
  itemCount,
  fireImmediateWhenNoView = true,
}: UseHomeViewedEventParams) => {
  const {
    subscribeToScroll,
    viewportHeight,
    containerScreenY,
    entryPoint,
    visitId,
    notifySectionViewed,
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
      createEventBuilder(MetaMetricsEvents.HOME_VIEWED)
        .addProperties({
          interaction_type: 'section_viewed',
          location: 'home',
          section_name: sectionName,
          section_index: sectionIndex,
          total_sections_loaded: totalSectionsLoaded,
          is_empty: isEmpty,
          item_count: itemCount,
          entry_point: entryPoint,
        })
        .build(),
    );
    notifySectionViewed(sectionName);
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
    notifySectionViewed,
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
    if (!fireImmediateWhenNoView) return;
    fireEvent();
  }, [sectionRef, isLoading, fireEvent, visitId, fireImmediateWhenNoView]);

  // Holds the latest checkVisibility so the onLayout callback can re-trigger
  // a check after the native layout pass completes.
  const checkVisibilityRef = useRef<() => void>(() => undefined);

  // For sections that DO render: check viewport visibility on mount and on
  // every scroll event. Uses subscribeToScroll so no React re-renders occur
  // during scrolling.
  useEffect(() => {
    if (isLoading || !sectionRef?.current || viewportHeight === 0) return;

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
        // For sections taller than the viewport (e.g. a long NFTs list),
        // 30% of the section height can exceed the full viewport, making the
        // event nearly impossible to trigger. Cap the threshold at 30% of
        // the viewport so tall sections fire reliably.
        const threshold = Math.min(height * 0.3, viewportHeight * 0.3);
        if (visiblePx >= threshold) {
          fireEvent();
        }
      });
    };

    checkVisibilityRef.current = checkVisibility;

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
    isLoading,
  ]);

  // Sections attach this to their root View's onLayout prop. onLayout fires
  // after the native layout pass, at which point measureInWindow returns real
  // dimensions — fixing the height === 0 early-return on initial mount.
  const onLayout = useCallback(() => {
    checkVisibilityRef.current();
  }, []);

  return { onLayout };
};

export default useHomeViewedEvent;
