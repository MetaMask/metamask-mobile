import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { isInViewport, type ViewportBounds } from './intersectsViewport';
import { useScrollViewportContext } from './ScrollViewportContext';

export type ViewportLifecycleMode = 'observe' | 'unmount-when-far';
type VisibilityPhase = 'pending' | 'visible' | 'hidden';

interface ViewportLifecycleProps {
  children: React.ReactNode;
  onVisible?: () => void;
  onHidden?: () => void;
  mode?: ViewportLifecycleMode;
  /** Fraction of the smaller rect that must overlap before onVisible fires. */
  threshold?: number;
  /** Pixels outside the viewport that still count as near. */
  preloadMargin?: number;
  /**
   * Render children before the first viewport measurement.
   * Without a ScrollViewportProvider, children always render.
   */
  initiallyMounted?: boolean;
  /** Reserved height while children are unmounted, so scroll position does not collapse. */
  placeholderHeight?: number;
}

function ViewportLifecycle({
  children,
  onVisible,
  onHidden,
  mode = 'observe',
  threshold = 0,
  preloadMargin = 0,
  initiallyMounted = true,
  placeholderHeight = 0,
}: ViewportLifecycleProps) {
  const viewport = useScrollViewportContext();
  const ref = useRef<View>(null);
  const reservedHeightRef = useRef(placeholderHeight);
  const phaseRef = useRef<VisibilityPhase>('pending');
  const onVisibleRef = useRef(onVisible);
  const onHiddenRef = useRef(onHidden);
  const [phase, setPhase] = useState<VisibilityPhase>('pending');

  onVisibleRef.current = onVisible;
  onHiddenRef.current = onHidden;

  const check = useCallback(
    (bounds: ViewportBounds) => {
      ref.current?.measureInWindow((_x, y, _width, height) => {
        if (height > 0) {
          reservedHeightRef.current = height;
        }
        if (height <= 0) {
          return;
        }

        const nextPhase: VisibilityPhase = isInViewport({ y, height }, bounds, {
          threshold,
          rootMargin: preloadMargin,
        })
          ? 'visible'
          : 'hidden';

        if (nextPhase === phaseRef.current) {
          return;
        }

        phaseRef.current = nextPhase;
        setPhase(nextPhase);
        if (nextPhase === 'visible') {
          onVisibleRef.current?.();
          return;
        }
        onHiddenRef.current?.();
      });
    },
    [preloadMargin, threshold],
  );

  useEffect(() => {
    if (!viewport) {
      return;
    }
    const unsubscribe = viewport.subscribe(check);
    const lastBounds = viewport.getLastBounds();
    if (lastBounds) {
      check(lastBounds);
    }
    return unsubscribe;
  }, [check, viewport]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;
    if (nextHeight > 0) {
      reservedHeightRef.current = nextHeight;
    }
    const lastBounds = viewport?.getLastBounds();
    if (lastBounds) {
      check(lastBounds);
    }
  };

  const hasProvider = viewport !== null;
  const renderChildren =
    !hasProvider ||
    mode === 'observe' ||
    phase === 'visible' ||
    (phase === 'pending' && initiallyMounted);

  const placeholderStyle: StyleProp<ViewStyle> =
    hasProvider && mode === 'unmount-when-far' && !renderChildren
      ? {
          // A 0-height slot never intersects, so it can never mount.
          height: reservedHeightRef.current || placeholderHeight || 1,
        }
      : undefined;

  return (
    <View ref={ref} onLayout={handleLayout} style={placeholderStyle}>
      {renderChildren ? children : null}
    </View>
  );
}

export default ViewportLifecycle;
