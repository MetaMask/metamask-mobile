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
import type { SharedValue } from 'react-native-reanimated';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

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

interface ChromeStore {
  node: ReactNode;
  listeners: Set<() => void>;
}

const ChromeStoreContext = createContext<ChromeStore | null>(null);
const ChromeInsetContext = createContext(0);

/**
 * Gap between the pinned chrome (header + tab row) and the first scrollable
 * content below it. Added on top of the measured chrome height so content
 * starts 16px under the tabs.
 */
export const FIXED_HUB_CONTENT_GAP = 16;

const ChromeOverlay = ({
  onLayout,
}: {
  onLayout: (event: LayoutChangeEvent) => void;
}) => {
  const tw = useTailwind();
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
    <View
      pointerEvents="box-none"
      style={[styles.overlay, tw.style('bg-default')]}
      onLayout={onLayout}
      testID="fixed-hub-chrome-backdrop"
    >
      {/* The overlay itself carries the default background (in place of the
        old scroll-blur sibling fill), so the pinned header and tabs keep a
        solid fill that covers the whole laid-out chrome area and cannot be
        detached from it by a child's layout. */}
      {store.node}
    </View>
  );
};

/**
 * Pins hub chrome over the page on a solid fill. A screen publishes its
 * header and tabs; this draws them fixed above the scroll on the default
 * background, so the top chrome stays put like the Social screen's.
 */
export const FixedHubChromeProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const store = useMemo<ChromeStore>(
    () => ({ node: null, listeners: new Set() }),
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
 * @deprecated The pinned chrome no longer blurs on scroll, so there is no
 * backdrop for a scroll distance to drive. Kept as a no-op so the hub screens
 * that still publish their scroll do not have to change; safe to remove call
 * by call.
 */
export const useFixedHubChromeScroll = (
  _scrollDistance: SharedValue<number> | null,
): void => undefined;

/**
 * First child of a hub scroll. Scrolls away so content passes under the
 * chrome. `extraGap` lets a single screen push its content further below the
 * pinned tabs without changing the shared clearance every other hub screen
 * gets (e.g. the Swaps tabs sit 8px lower than the default).
 */
export const FixedHubChromeSpacer = ({
  extraGap = 0,
}: {
  extraGap?: number;
}) => {
  const inset = useFixedHubChromeInset();
  if (inset <= 0) {
    return null;
  }
  return (
    <View
      testID="fixed-hub-chrome-spacer"
      style={{ height: inset + FIXED_HUB_CONTENT_GAP + extraGap }}
    />
  );
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
