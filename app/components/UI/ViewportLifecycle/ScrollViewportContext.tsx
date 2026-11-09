import React, {
  createContext,
  useCallback,
  useContext,
  useImperativeHandle,
  useMemo,
  useRef,
  type RefObject,
  type ReactNode,
} from 'react';
import type { ViewportBounds } from './intersectsViewport';

export interface MeasurableView {
  measureInWindow: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void;
}

export interface ViewportPublisher {
  publishBounds: (bounds: ViewportBounds) => void;
  publishView: (view: unknown) => void;
}

type ViewportListener = (bounds: ViewportBounds) => void;

interface ScrollViewportContextValue {
  subscribe: (listener: ViewportListener) => () => void;
  /** Last published bounds, so a section laid out after a publish can check itself. */
  getLastBounds: () => ViewportBounds | null;
}

const ScrollViewportContext = createContext<ScrollViewportContextValue | null>(
  null,
);

export function asMeasurableView(value: unknown): MeasurableView | null {
  if (
    typeof value === 'object' &&
    value !== null &&
    'measureInWindow' in value &&
    typeof (value as MeasurableView).measureInWindow === 'function'
  ) {
    return value as MeasurableView;
  }
  return null;
}

interface ScrollViewportProviderProps {
  children: ReactNode;
  publishRef: RefObject<ViewportPublisher | null>;
}

export function ScrollViewportProvider({
  children,
  publishRef,
}: ScrollViewportProviderProps) {
  const listenersRef = useRef(new Set<ViewportListener>());
  const lastBoundsRef = useRef<ViewportBounds | null>(null);

  const emit = useCallback((bounds: ViewportBounds) => {
    if (bounds.height <= 0) {
      return;
    }
    lastBoundsRef.current = bounds;
    listenersRef.current.forEach((listener) => listener(bounds));
  }, []);

  const publishView = useCallback(
    (view: unknown) => {
      const measurable = asMeasurableView(view);
      if (!measurable) {
        return;
      }
      measurable.measureInWindow((_x, y, _width, height) => {
        emit({ top: y, height });
      });
    },
    [emit],
  );

  useImperativeHandle(
    publishRef,
    () => ({ publishBounds: emit, publishView }),
    [emit, publishView],
  );

  const value = useMemo<ScrollViewportContextValue>(
    () => ({
      subscribe(listener) {
        listenersRef.current.add(listener);
        return () => {
          listenersRef.current.delete(listener);
        };
      },
      getLastBounds: () => lastBoundsRef.current,
    }),
    [],
  );

  return (
    <ScrollViewportContext.Provider value={value}>
      {children}
    </ScrollViewportContext.Provider>
  );
}

export function useScrollViewportContext() {
  return useContext(ScrollViewportContext);
}

const lastTargetPublishAt = new WeakMap<object, number>();

export function publishViewportTarget(
  publishRef: RefObject<ViewportPublisher | null>,
  target: unknown,
  options?: { force?: boolean },
) {
  if (!publishRef.current) {
    return;
  }
  const now = Date.now();
  const previous = lastTargetPublishAt.get(publishRef) ?? 0;
  if (!options?.force && now - previous < 100) {
    return;
  }
  lastTargetPublishAt.set(publishRef, now);

  const measurable = asMeasurableView(target);
  if (!measurable) {
    return;
  }
  measurable.measureInWindow((_x, y, _width, height) => {
    publishRef.current?.publishBounds({ top: y, height });
  });
}
