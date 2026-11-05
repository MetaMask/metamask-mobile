import React, { useCallback, useContext, useSyncExternalStore } from 'react';
import { TraderStatRotationContext } from './TraderStatRotationContext';

/** Which rows of a virtualized feed are in the viewport. */
export interface SocialFeedViewability {
  isViewable: (key: string) => boolean;
  subscribe: (listener: () => void) => () => void;
  setViewableKeys: (keys: readonly string[]) => void;
}

/**
 * Every row counts as viewable until the list first reports, so the rows on
 * screen at mount rotate without waiting for a viewability callback.
 */
export const createSocialFeedViewability = (): SocialFeedViewability => {
  let viewable: ReadonlySet<string> | null = null;
  const listeners = new Set<() => void>();
  return {
    isViewable: (key) => viewable === null || viewable.has(key),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setViewableKeys: (keys) => {
      viewable = new Set(keys);
      listeners.forEach((listener) => listener());
    },
  };
};

interface SocialFeedRowViewabilityProviderProps {
  viewability: SocialFeedViewability;
  rowKey: string;
  children: React.ReactNode;
}

/**
 * Lets a row's trader stats rotate only while the row is in the viewport and
 * its page is on screen. Rows kept mounted above and below the viewport
 * otherwise re-render on every rotation tick.
 */
export const SocialFeedRowViewabilityProvider: React.FC<
  SocialFeedRowViewabilityProviderProps
> = ({ viewability, rowKey, children }) => {
  const isPageOnScreen = useContext(TraderStatRotationContext);
  const getSnapshot = useCallback(
    () => viewability.isViewable(rowKey),
    [rowKey, viewability],
  );
  const isViewable = useSyncExternalStore(viewability.subscribe, getSnapshot);
  return (
    <TraderStatRotationContext.Provider value={isPageOnScreen && isViewable}>
      {children}
    </TraderStatRotationContext.Provider>
  );
};
