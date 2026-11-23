import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import type { View } from 'react-native';
import {
  useExploreScrollContext,
  type ExploreViewportBounds,
} from '../components/ExploreScroll';

export const EXPLORE_SECTION_VISIBILITY_THRESHOLD = 0.3;

const useExploreSectionVisibility = (
  sectionRef: RefObject<View | null>,
  enabled: boolean,
  isLoading: boolean,
) => {
  const { isAvailable, subscribeToScroll, measureViewport } =
    useExploreScrollContext();
  const [isVisible, setIsVisible] = useState(!isAvailable);
  const isVisibleRef = useRef(!isAvailable);
  const checkVisibilityRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (!isAvailable) {
      checkVisibilityRef.current = () => undefined;
      return;
    }

    if (!enabled || isLoading || isVisibleRef.current || !sectionRef.current) {
      checkVisibilityRef.current = () => undefined;

      if (!enabled || isLoading) {
        isVisibleRef.current = false;
        setIsVisible(false);
      }
      return;
    }

    let isActive = true;

    const checkVisibility = (viewportBounds?: ExploreViewportBounds) => {
      const measureSection = ({
        screenY: viewportScreenY,
        height: viewportHeight,
      }: ExploreViewportBounds) => {
        if (!isActive || viewportHeight === 0) return;

        // Measure section position relative to the device screen.
        sectionRef.current?.measureInWindow(
          (_sectionScreenX, sectionScreenY, _sectionWidth, sectionHeight) => {
            if (!isActive || sectionHeight === 0) return;

            const viewportBottom = viewportScreenY + viewportHeight;

            // Find how many vertical pixels the section shares with the viewport.
            const visiblePixels =
              Math.min(sectionScreenY + sectionHeight, viewportBottom) -
              Math.max(sectionScreenY, viewportScreenY);

            // Require 30% of the smaller area to be visible.
            const visibilityThreshold = Math.min(
              sectionHeight * EXPLORE_SECTION_VISIBILITY_THRESHOLD,
              viewportHeight * EXPLORE_SECTION_VISIBILITY_THRESHOLD,
            );
            const nextIsVisible = visiblePixels >= visibilityThreshold;

            if (nextIsVisible !== isVisibleRef.current) {
              isVisibleRef.current = nextIsVisible;
              setIsVisible(nextIsVisible);
            }
          },
        );
      };

      if (viewportBounds) {
        // Reuse bounds from the scroll event when available.
        measureSection(viewportBounds);
        return;
      }

      // Otherwise, measure the viewport before measuring the section.
      measureViewport(measureSection);
    };

    checkVisibilityRef.current = checkVisibility;
    checkVisibility();

    const unsubscribe = subscribeToScroll(checkVisibility);
    return () => {
      isActive = false;
      checkVisibilityRef.current = () => undefined;
      unsubscribe();
    };
  }, [
    enabled,
    isAvailable,
    isLoading,
    isVisible,
    measureViewport,
    sectionRef,
    subscribeToScroll,
  ]);

  const onLayout = useCallback(() => {
    checkVisibilityRef.current();
  }, []);

  return { isVisible, onLayout };
};

export default useExploreSectionVisibility;
