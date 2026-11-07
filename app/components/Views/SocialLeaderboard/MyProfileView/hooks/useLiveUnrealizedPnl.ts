import { useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import type { View } from 'react-native';
import type { Position } from '@metamask/social-controllers';
import { SocialFeedPageActiveContext } from '../../../../UI/SocialFeed/components/SocialFeedPageActiveContext';
import { useSocialLivePrices } from '../../../../UI/SocialFeed/live/SocialLivePricesContext';
import {
  buildLiveUnrealizedEntries,
  sumLiveUnrealizedPnl,
} from '../utils/sumLiveUnrealizedPnl';

export interface UseLiveUnrealizedPnlResult {
  /** Attach to a non-collapsable view that is on screen with the cell. */
  trackRef: React.RefObject<View | null>;
  /** `null` when no open position can be priced. */
  unrealizedPnl: number | null;
}

/**
 * Unrealized P&L across a profile's open positions, following the same
 * streamed prices the open cards use. It reads the API figure until a price
 * arrives, and without `SocialLivePricesProvider` it never leaves it.
 */
export const useLiveUnrealizedPnl = (
  openPositions: readonly Position[],
): UseLiveUnrealizedPnlResult => {
  const context = useSocialLivePrices();
  const isPageActive = useContext(SocialFeedPageActiveContext);
  const trackRef = useRef<View>(null);
  const [, bumpTick] = useReducer((tick: number) => tick + 1, 0);

  const entries = useMemo(
    () => buildLiveUnrealizedEntries(openPositions),
    [openPositions],
  );
  const keys = useMemo(
    () => [
      ...new Set(entries.flatMap(({ source }) => (source ? [source.key] : []))),
    ],
    [entries],
  );

  useEffect(() => {
    if (!context || !isPageActive || keys.length === 0) {
      return undefined;
    }
    const unregister = entries.flatMap(({ position, source }) =>
      source
        ? [
            context.register(
              `profile-unrealized:${position.positionId}`,
              source.key,
              trackRef,
            ),
          ]
        : [],
    );
    const unsubscribe = keys.map((key) =>
      context.store.subscribe(key, bumpTick),
    );
    return () => {
      unregister.forEach((release) => release());
      unsubscribe.forEach((release) => release());
    };
  }, [context, entries, isPageActive, keys]);

  const unrealizedPnl = sumLiveUnrealizedPnl(
    entries,
    (key) => context?.store.get(key)?.price,
  );

  return { trackRef, unrealizedPnl };
};
