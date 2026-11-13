import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import type { View } from 'react-native';
import { SocialFeedPageActiveContext } from '../components/SocialFeedPageActiveContext';
import { computeLivePositionFigures } from './computeLivePositionFigures';
import type { SocialLivePriceEntry } from './SocialLivePriceStore';
import { useSocialLivePrices } from './SocialLivePricesContext';
import type {
  SocialLivePositionFigures,
  SocialLivePriceKey,
  SocialLivePriceSource,
} from './types';

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
 *
 * On an inactive page (another tab, or the feed blurred under a sheet or the
 * copy-trade order screen) the card stops listening but holds its last live
 * price. Dropping back to the API snapshot there flashes a stale price and
 * P&L until the page is active and ticks again (TSA-1655).
 */
export function useSocialLivePrice(
  id: string,
  live: SocialLivePriceSource | undefined,
): UseSocialLivePriceResult {
  const context = useSocialLivePrices();
  const isPageActive = useContext(SocialFeedPageActiveContext);
  const trackRef = useRef<View>(null);
  const key = isPageActive ? live?.key : undefined;

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
  const streamedEntry = useSyncExternalStore(subscribe, getSnapshot);

  const lastEntryRef = useRef<{
    key: SocialLivePriceKey;
    entry: SocialLivePriceEntry;
  } | null>(null);
  if (streamedEntry && key) {
    lastEntryRef.current = { key, entry: streamedEntry };
  }
  const heldEntry =
    lastEntryRef.current && lastEntryRef.current.key === live?.key
      ? lastEntryRef.current.entry
      : undefined;
  const entry = streamedEntry ?? heldEntry;

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
