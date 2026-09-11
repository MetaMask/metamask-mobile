import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import type { View } from 'react-native';
import { useHomepageScrollContext } from '../context/HomepageScrollContext';

interface UseSectionViewportVisibleOptions {
  /** Defer visibility checks until section data has loaded. */
  isLoading?: boolean;
}

/**
 * Tracks whether a homepage section is vertically visible (≥ 30 % of the
 * section intersects the homepage scroll viewport). Unlike
 * `useHomeViewedEvent`, this exposes continuous on/off state for features
 * such as background prefetching.
 */
export const useSectionViewportVisible = (
  sectionRef: RefObject<View | null>,
  options?: UseSectionViewportVisibleOptions,
) => {
  const { subscribeToScroll, viewportHeight, containerScreenY, visitId } =
    useHomepageScrollContext();
  const [isVisible, setIsVisible] = useState(false);
  const isVisibleRef = useRef(false);
  const isLoading = options?.isLoading ?? false;

  const checkVisibilityRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (isLoading || !sectionRef.current || viewportHeight === 0) {
      if (isVisibleRef.current) {
        isVisibleRef.current = false;
        setIsVisible(false);
      }
      return;
    }

    const checkVisibility = () => {
      sectionRef.current?.measureInWindow((_x, y, _width, height) => {
        if (height === 0) {
          return;
        }

        const viewportTop = containerScreenY;
        const viewportBottom = containerScreenY + viewportHeight;
        const visiblePx =
          Math.min(y + height, viewportBottom) - Math.max(y, viewportTop);
        const threshold = Math.min(height * 0.3, viewportHeight * 0.3);
        const nextVisible = visiblePx >= threshold;

        if (nextVisible !== isVisibleRef.current) {
          isVisibleRef.current = nextVisible;
          setIsVisible(nextVisible);
        }
      });
    };

    checkVisibilityRef.current = checkVisibility;
    checkVisibility();

    const unsubscribe = subscribeToScroll(checkVisibility);
    return unsubscribe;
  }, [
    isLoading,
    viewportHeight,
    containerScreenY,
    sectionRef,
    subscribeToScroll,
    visitId,
  ]);

  const onLayout = useCallback(() => {
    checkVisibilityRef.current();
  }, []);

  return { isVisible, onLayout };
};

export default useSectionViewportVisible;
