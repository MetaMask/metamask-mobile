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
  /** Preserve true and stop observing after the section is first visible. */
  once?: boolean;
}

/**
 * Tracks whether a homepage section is vertically visible (≥ 30 % of the
 * section intersects the homepage scroll viewport). Unlike
 * `useHomeViewedEvent`, this exposes on/off state for features such as
 * background prefetching, or a sticky first-visible state with `once`.
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
  const once = options?.once ?? false;

  const checkVisibilityRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (once && isVisibleRef.current) {
      checkVisibilityRef.current = () => undefined;
      return;
    }

    if (isLoading || !sectionRef.current || viewportHeight === 0) {
      checkVisibilityRef.current = () => undefined;
      if (isVisibleRef.current) {
        isVisibleRef.current = false;
        setIsVisible(false);
      }
      return;
    }

    let unsubscribe: (() => void) | undefined;
    const stopObserving = () => {
      unsubscribe?.();
      unsubscribe = undefined;
    };

    const updateVisibility = (nextVisible: boolean) => {
      if (once && isVisibleRef.current) {
        return;
      }
      if (nextVisible !== isVisibleRef.current) {
        isVisibleRef.current = nextVisible;
        setIsVisible(nextVisible);
      }
      if (nextVisible && once) {
        stopObserving();
      }
    };

    const checkVisibility = () => {
      if (once && isVisibleRef.current) {
        return;
      }
      sectionRef.current?.measureInWindow((_x, y, _width, height) => {
        if (height === 0) {
          updateVisibility(false);
          return;
        }

        const viewportTop = containerScreenY;
        const viewportBottom = containerScreenY + viewportHeight;
        const visiblePx =
          Math.min(y + height, viewportBottom) - Math.max(y, viewportTop);
        const threshold = Math.min(height * 0.3, viewportHeight * 0.3);
        const nextVisible = visiblePx >= threshold;

        updateVisibility(nextVisible);
      });
    };

    checkVisibilityRef.current = checkVisibility;
    checkVisibility();

    if (!(once && isVisibleRef.current)) {
      unsubscribe = subscribeToScroll(checkVisibility);
    }
    return stopObserving;
  }, [
    isLoading,
    once,
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
