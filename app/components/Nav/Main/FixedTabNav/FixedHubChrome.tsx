import React, {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { makeMutable, type SharedValue } from 'react-native-reanimated';
import { HeaderGlassBackdrop } from '../../../../component-library/components-temp/HeaderGlass';

// Height of the pill row pinned under the header (py-4 padding plus the
// capsule), so the backdrop blurs through it instead of fading at the seam.
const PILL_ROW_HEIGHT = 64;

const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  spacer: {
    width: '100%',
  },
});

/**
 * Backdrop driver for a screen that publishes chrome but no scroll yet (e.g.
 * Swaps). Zero keeps the backdrop transparent at rest; without it the
 * backdrop defaults to always-on and dims the content under the pills.
 */
const RESTING_SCROLL_DISTANCE = makeMutable(0);

interface ChromeStore {
  node: ReactNode;
  /** Scroll distance driving the overlay's blur; published by the screen. */
  scrollDistance: SharedValue<number> | null;
  listeners: Set<() => void>;
}

const ChromeStoreContext = createContext<ChromeStore | null>(null);
const ChromeInsetContext = createContext(0);

const ChromeOverlay = ({
  onLayout,
}: {
  onLayout: (event: LayoutChangeEvent) => void;
}) => {
  const store = useContext(ChromeStoreContext);
  const [, setTick] = useState(0);

  useLayoutEffect(() => {
    if (!store) {
      return undefined;
    }
    const listener = () => setTick((tick) => tick + 1);
    store.listeners.add(listener);
    // A screen can publish its header before this overlay subscribes.
    listener();
    return () => {
      store.listeners.delete(listener);
    };
  }, [store]);

  if (!store?.node) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.overlay} onLayout={onLayout}>
      <HeaderGlassBackdrop
        scrollDistance={store.scrollDistance ?? RESTING_SCROLL_DISTANCE}
        extension={PILL_ROW_HEIGHT}
        testID="fixed-hub-chrome-backdrop"
      />
      {store.node}
    </View>
  );
};

/**
 * Pins hub chrome over the page. A screen publishes its header and pills;
 * this draws them above the scroll with no fill, so content can pass under
 * the glass.
 */
export const FixedHubChromeProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const store = useMemo<ChromeStore>(
    () => ({ node: null, scrollDistance: null, listeners: new Set() }),
    [],
  );
  const [inset, setInset] = useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.height;
    setInset((current) => (Math.abs(current - next) > 1 ? next : current));
  };

  return (
    <ChromeStoreContext.Provider value={store}>
      <ChromeInsetContext.Provider value={inset}>
        <View style={styles.host}>
          {children}
          <ChromeOverlay onLayout={handleLayout} />
        </View>
      </ChromeInsetContext.Provider>
    </ChromeStoreContext.Provider>
  );
};

/** Space the scroll content needs so it starts below the pinned chrome. */
export const useFixedHubChromeInset = (): number =>
  useContext(ChromeInsetContext);

/**
 * Publishes the screen's scroll distance so the pinned chrome's backdrop
 * blurs as content passes under it. Null outside a hub is a no-op.
 */
export const useFixedHubChromeScroll = (
  scrollDistance: SharedValue<number> | null,
): void => {
  const store = useContext(ChromeStoreContext);
  const scrollRef = useRef(scrollDistance);
  scrollRef.current = scrollDistance;

  useLayoutEffect(() => {
    if (!store) {
      return undefined;
    }
    store.scrollDistance = scrollRef.current;
    store.listeners.forEach((listener) => listener());
    return () => {
      if (store.scrollDistance === scrollRef.current) {
        store.scrollDistance = null;
        store.listeners.forEach((listener) => listener());
      }
    };
  });
};

/** First child of a hub scroll. Scrolls away so content passes under the chrome. */
export const FixedHubChromeSpacer = () => {
  const inset = useFixedHubChromeInset();
  if (inset <= 0) {
    return null;
  }
  return <View style={{ height: inset }} />;
};

/**
 * Publishes `children` to the hub overlay. Outside a hub they stay in place,
 * so a screen opened on its own keeps a normal header.
 */
export const FixedHubChrome = ({ children }: { children: ReactNode }) => {
  const store = useContext(ChromeStoreContext);
  const childrenRef = useRef(children);
  childrenRef.current = children;

  useLayoutEffect(() => {
    if (!store) {
      return undefined;
    }
    store.node = childrenRef.current;
    store.listeners.forEach((listener) => listener());
    return () => {
      if (store.node === childrenRef.current) {
        store.node = null;
        store.listeners.forEach((listener) => listener());
      }
    };
  });

  if (!store) {
    return <>{children}</>;
  }
  return null;
};
