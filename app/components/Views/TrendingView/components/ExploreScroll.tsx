import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from 'react';
import {
  RefreshControl,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../util/theme';

export interface ExploreViewportBounds {
  screenY: number;
  height: number;
}

type ExploreScrollSubscriber = (viewportBounds: ExploreViewportBounds) => void;

interface ExploreScrollContextValue {
  isAvailable: boolean;
  subscribeToScroll: (callback: ExploreScrollSubscriber) => () => void;
  measureViewport: (
    callback: (viewportBounds: ExploreViewportBounds) => void,
  ) => void;
}

const ExploreScrollContext = createContext<ExploreScrollContextValue>({
  isAvailable: false,
  subscribeToScroll: () => () => undefined,
  measureViewport: () => undefined,
});

export const useExploreScrollContext = () => useContext(ExploreScrollContext);

interface ExploreScrollProps {
  refreshing: boolean;
  onRefresh: () => void;
  testID?: string;
  children: React.ReactNode;
}

/**
 * Vertical ScrollView wrapper for an Explore tab body. Owns top/bottom padding and
 * pull-to-refresh wiring; horizontal inset is owned by section headers/content.
 */
const ExploreScroll: React.FC<ExploreScrollProps> = ({
  refreshing,
  onRefresh,
  testID,
  children,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollSubscribersRef = useRef(new Set<ExploreScrollSubscriber>());

  const subscribeToScroll = useCallback((callback: ExploreScrollSubscriber) => {
    scrollSubscribersRef.current.add(callback);

    return () => {
      scrollSubscribersRef.current.delete(callback);
    };
  }, []);

  const measureViewport = useCallback(
    (callback: (viewportBounds: ExploreViewportBounds) => void) => {
      const scrollView = scrollViewRef.current as unknown as View | null;
      scrollView?.measureInWindow(
        (_x: number, y: number, _width: number, height: number) => {
          callback({ screenY: y, height });
        },
      );
    },
    [],
  );

  const notifyScrollSubscribers = useCallback(() => {
    measureViewport((viewportBounds) => {
      scrollSubscribersRef.current.forEach((callback) =>
        callback(viewportBounds),
      );
    });
  }, [measureViewport]);

  const handleScroll = useCallback(
    (_event: NativeSyntheticEvent<NativeScrollEvent>) => {
      notifyScrollSubscribers();
    },
    [notifyScrollSubscribers],
  );

  const handleLayout = useCallback(() => {
    notifyScrollSubscribers();
  }, [notifyScrollSubscribers]);

  const contextValue = useMemo(
    () => ({
      isAvailable: true,
      subscribeToScroll,
      measureViewport,
    }),
    [measureViewport, subscribeToScroll],
  );

  return (
    <ExploreScrollContext.Provider value={contextValue}>
      <ScrollView
        ref={scrollViewRef}
        testID={testID}
        style={tw.style('flex-1 pt-3')}
        contentContainerStyle={tw.style('pb-4')}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={50}
        onLayout={handleLayout}
        onScroll={handleScroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.icon.default}
            colors={[colors.primary.default]}
          />
        }
      >
        {children}
      </ScrollView>
    </ExploreScrollContext.Provider>
  );
};

export default ExploreScroll;
