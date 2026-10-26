import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import type { View } from 'react-native';
import { computeLivePositionFigures } from './computeLivePositionFigures';
import { useSocialLivePrices } from './SocialLivePricesContext';
import type { SocialLivePositionFigures, SocialLivePriceSource } from './types';

const noopUnsubscribe = () => undefined;

export interface UseSocialLivePriceResult {
  /** Attach to a non-collapsable view on the card so it can be measured. */
  trackRef: React.RefObject<View | null>;
  /** `null` until the first streamed price, and outside the provider. */
  figures: SocialLivePositionFigures | null;
  reduceMotion: boolean;
}

/**
 * Live figures for one open position card. Registers the card for visibility
 * tracking and re-renders only when its own asset ticks. A no-op without a
 * `live` source or outside `SocialLivePricesProvider`.
 */
export function useSocialLivePrice(
  id: string,
  live: SocialLivePriceSource | undefined,
): UseSocialLivePriceResult {
  const context = useSocialLivePrices();
  const trackRef = useRef<View>(null);
  const key = live?.key;

  useEffect(() => {
    if (!context || !key) {
      return undefined;
    }
    return context.register(id, key, trackRef);
  }, [context, id, key]);

  const subscribe = useCallback(
    (listener: () => void) =>
      context && key ? context.store.subscribe(key, listener) : noopUnsubscribe,
    [context, key],
  );
  const getSnapshot = useCallback(
    () => (context && key ? context.store.get(key) : undefined),
    [context, key],
  );
  const entry = useSyncExternalStore(subscribe, getSnapshot);

  const figures = useMemo(
    () =>
      entry && live ? computeLivePositionFigures(live, entry.price) : null,
    [entry, live],
  );

  return {
    trackRef,
    figures,
    reduceMotion: context?.reduceMotion ?? false,
  };
}
