import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Dimensions, type View } from 'react-native';
import { usePrototypeMotion } from './usePrototypeMotion';

type ScrollListener = () => void;

interface FeedScrollValue {
  subscribe: (listener: ScrollListener) => () => void;
  /** Coalesces to one notification per frame. */
  notify: () => void;
}

const FeedScrollContext = createContext<FeedScrollValue | null>(null);

/** Shares feed and category scroll movement with cards that reveal on entry. */
export const FeedScrollProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const listeners = useRef(new Set<ScrollListener>());
  const frame = useRef<number | null>(null);
  const value = useMemo<FeedScrollValue>(
    () => ({
      subscribe(listener) {
        listeners.current.add(listener);
        listener();
        return () => {
          listeners.current.delete(listener);
        };
      },
      notify() {
        if (frame.current !== null) return;
        frame.current = requestAnimationFrame(() => {
          frame.current = null;
          listeners.current.forEach((listener) => listener());
        });
      },
    }),
    [],
  );
  return (
    <FeedScrollContext.Provider value={value}>
      {children}
    </FeedScrollContext.Provider>
  );
};

export const useFeedScroll = () => useContext(FeedScrollContext);

const REVEAL_MS = 700;
const VISIBLE_PX = 24;

/**
 * 0 until this view has scrolled 24px into the window, then eases to 1.
 * Low-memory phones skip the draw and start at 1. Without a feed scroller,
 * the view reveals from its own layout.
 */
export const useRevealOnScroll = () => {
  const { shouldAnimate } = usePrototypeMotion();
  const scroll = useFeedScroll();
  const ref = useRef<View>(null);
  const frame = useRef<number | null>(null);
  const started = useRef(!shouldAnimate);
  const [progress, setProgress] = useState(shouldAnimate ? 0 : 1);

  const check = useCallback(() => {
    if (started.current) return;
    const node = ref.current;
    if (!node?.measureInWindow) return;
    node.measureInWindow((x, y, width, height) => {
      if (started.current || width < 1 || height < 1) return;
      const window = Dimensions.get('window');
      const overlapX = Math.min(x + width, window.width) - Math.max(x, 0);
      const overlapY = Math.min(y + height, window.height) - Math.max(y, 0);
      if (overlapX < VISIBLE_PX || overlapY < VISIBLE_PX) return;
      started.current = true;
      const startAt = Date.now();
      const tick = () => {
        const amount = Math.min(1, (Date.now() - startAt) / REVEAL_MS);
        setProgress(1 - (1 - amount) ** 3);
        if (amount < 1) frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
    });
  }, []);

  useEffect(() => {
    if (!shouldAnimate) return undefined;
    const unsubscribe = scroll?.subscribe(check);
    return () => {
      unsubscribe?.();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [check, scroll, shouldAnimate]);

  return { ref, progress, check };
};
