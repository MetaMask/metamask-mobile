import { useCallback, useRef, useState } from 'react';
import { Dimensions, type LayoutChangeEvent } from 'react-native';

export interface UsePerpsSectionNearViewportOptions {
  /** Tracks nothing and reports false while off. */
  enabled: boolean;
  /** Counts the section as near this many points before and after it is on screen. */
  marginPx: number;
}

export interface UsePerpsSectionNearViewportResult {
  isNearViewport: boolean;
  /** Section wrapper `onLayout`, in the scroll content's coordinates. */
  handleLayout: (event: LayoutChangeEvent) => void;
  handleScroll: (scrollY: number, viewportHeight: number) => void;
}

interface SectionBounds {
  top: number;
  height: number;
}

interface ViewportPosition {
  scrollY: number;
  viewportHeight: number;
}

/**
 * Whether one section of a scrolling screen is on screen or close to it.
 * State only changes when the answer flips, not on every scroll event.
 */
export const usePerpsSectionNearViewport = ({
  enabled,
  marginPx,
}: UsePerpsSectionNearViewportOptions): UsePerpsSectionNearViewportResult => {
  const boundsRef = useRef<SectionBounds | null>(null);
  const viewportRef = useRef<ViewportPosition | null>(null);
  const [isNearViewport, setIsNearViewport] = useState(false);

  const evaluate = useCallback(() => {
    const bounds = boundsRef.current;
    if (!enabled || !bounds) {
      return;
    }
    const { scrollY, viewportHeight } = viewportRef.current ?? {
      scrollY: 0,
      viewportHeight: Dimensions.get('window').height,
    };
    const isNear =
      scrollY + viewportHeight + marginPx >= bounds.top &&
      scrollY - marginPx <= bounds.top + bounds.height;
    setIsNearViewport((current) => (current === isNear ? current : isNear));
  }, [enabled, marginPx]);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { y, height } = event.nativeEvent.layout;
      boundsRef.current = height > 0 ? { top: y, height } : null;
      evaluate();
    },
    [evaluate],
  );

  const handleScroll = useCallback(
    (scrollY: number, viewportHeight: number) => {
      viewportRef.current = { scrollY, viewportHeight };
      evaluate();
    },
    [evaluate],
  );

  return {
    isNearViewport: enabled && isNearViewport,
    handleLayout,
    handleScroll,
  };
};
