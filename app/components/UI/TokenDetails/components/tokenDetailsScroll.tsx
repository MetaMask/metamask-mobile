import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';

/** How close to the end of the page a list may be and still ask for more. */
export const LOAD_MORE_THRESHOLD_PX = 600;

type Listener = (distanceFromBottom: number) => void;

export interface TokenDetailsScrollValue {
  /** Subscribe to the page's distance-from-bottom; returns an unsubscribe. */
  subscribe: (listener: Listener) => () => void;
  /** Distance at subscribe time, so a short page pages in without scrolling. */
  getDistanceFromBottom: () => number;
}

const TokenDetailsScrollContext = createContext<TokenDetailsScrollValue | null>(
  null,
);

export const TokenDetailsScrollProvider = TokenDetailsScrollContext.Provider;

/**
 * Publishes how far the Token Details page is from its end.
 *
 * The tabs render inside the screen's own `ScrollView` and have no scroll of
 * their own, so a paginated tab cannot use `onEndReached`. It reads the page's
 * scroll instead: three native callbacks own one number each, and any of them
 * changing recomputes the distance and notifies whoever is listening.
 */
export const useTokenDetailsScroll = () => {
  const listeners = useRef(new Set<Listener>());
  const offsetY = useRef(0);
  const viewportHeight = useRef(0);
  const contentHeight = useRef(0);

  // Before layout and content are both measured the page is "infinitely far"
  // from its end: a zero viewport would otherwise read as already-at-the-end
  // and page the whole list in at once.
  const distanceFromBottom = useCallback(
    () =>
      viewportHeight.current > 0 && contentHeight.current > 0
        ? contentHeight.current - (offsetY.current + viewportHeight.current)
        : Number.POSITIVE_INFINITY,
    [],
  );

  const publish = useCallback(() => {
    const distance = distanceFromBottom();
    if (!Number.isFinite(distance)) {
      return;
    }
    listeners.current.forEach((listener) => listener(distance));
  }, [distanceFromBottom]);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      // Widened on purpose: a scroll event carries all three in the app, but
      // callers that synthesise one (tests, host screens re-dispatching) may
      // send the offset alone. Each field keeps its last value when absent.
      const nativeEvent: Partial<NativeScrollEvent> = event.nativeEvent;
      const { contentOffset, layoutMeasurement, contentSize } = nativeEvent;
      if (contentOffset) {
        offsetY.current = contentOffset.y;
      }
      if (layoutMeasurement) {
        viewportHeight.current = layoutMeasurement.height;
      }
      if (contentSize) {
        contentHeight.current = contentSize.height;
      }
      publish();
    },
    [publish],
  );

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      viewportHeight.current = event.nativeEvent.layout.height;
      publish();
    },
    [publish],
  );

  // Appending a page grows the content without any scrolling, and a first page
  // shorter than the screen never scrolls at all -- both need a fresh read.
  const onContentSizeChange = useCallback(
    (_width: number, height: number) => {
      contentHeight.current = height;
      publish();
    },
    [publish],
  );

  const value = useMemo<TokenDetailsScrollValue>(
    () => ({
      subscribe: (listener) => {
        listeners.current.add(listener);
        return () => {
          listeners.current.delete(listener);
        };
      },
      getDistanceFromBottom: distanceFromBottom,
    }),
    [distanceFromBottom],
  );

  return { value, onScroll, onLayout, onContentSizeChange };
};

export interface UseLoadMoreOnScrollOptions {
  /** Ask for more only while this holds -- the tab is visible and a page remains. */
  enabled: boolean;
  /** Called every time the page is within the threshold of its end. */
  onLoadMore: () => void;
}

/**
 * Calls `onLoadMore` while the page is near its end.
 *
 * Replaces the measure-on-a-timer footer probe these tabs used to carry: the
 * page already reports its scroll, so a list can read that instead of polling
 * its own position every few hundred milliseconds.
 *
 * Fires on subscribe as well as on scroll, so a first page shorter than the
 * screen still pages in. The caller is expected to make repeat calls cheap --
 * `useTokenHolders` and `useSocialFeed` both no-op while a page is in flight.
 */
export const useLoadMoreOnScroll = ({
  enabled,
  onLoadMore,
}: UseLoadMoreOnScrollOptions) => {
  const scroll = useContext(TokenDetailsScrollContext);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    if (!enabled || !scroll) {
      return undefined;
    }
    const check = (distanceFromBottom: number) => {
      if (distanceFromBottom <= LOAD_MORE_THRESHOLD_PX) {
        onLoadMoreRef.current();
      }
    };
    const unsubscribe = scroll.subscribe(check);
    check(scroll.getDistanceFromBottom());
    return unsubscribe;
  }, [enabled, scroll]);
};
