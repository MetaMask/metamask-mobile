import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type {
  PerpsMarginModeLock,
  PerpsProviderType,
} from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { selectPerpsNetwork } from '../selectors/perpsController';

export interface UsePerpsMarginModeLockParams {
  symbol: string;
  providerId?: PerpsProviderType;
  /** Skip the venue read when Cross cannot be picked anyway. */
  enabled: boolean;
  /** Changing this value triggers a fresh read (e.g. position opened/closed). */
  refreshKey?: string;
}

export interface UsePerpsMarginModeLockResult {
  /** Venue answer for the current market, account and network; null while unknown. */
  lock: PerpsMarginModeLock | null;
  /**
   * True once the venue answered `locked` or `unlocked` for the current
   * request. False while a read is pending, after a failed read, or when the
   * venue reports the lock as unavailable.
   */
  isResolved: boolean;
  /** Re-read the lock, e.g. before the trader changes the margin mode. */
  refresh: () => void;
}

interface LockReadResult {
  requestKey: string;
  lock: PerpsMarginModeLock | null;
}

/**
 * Reads the margin mode the venue has bound to a market through an open
 * position or resting order/TWAP, so the picker offers only a placeable mode.
 * An answer only counts for the market, account, network and refresh it was
 * read for; anything else reads as unknown until the new read resolves.
 *
 * @param params - Market, route, gate, and refresh trigger.
 * @returns The current lock, whether it is known, and a manual refresh.
 */
export const usePerpsMarginModeLock = ({
  symbol,
  providerId,
  enabled,
  refreshKey,
}: UsePerpsMarginModeLockParams): UsePerpsMarginModeLockResult => {
  const selectedAddress = useSelector(selectSelectedInternalAccountAddress);
  const perpsNetwork = useSelector(selectPerpsNetwork);
  const [refreshCount, setRefreshCount] = useState(0);
  const [readResult, setReadResult] = useState<LockReadResult | null>(null);
  const refresh = useCallback(() => setRefreshCount((count) => count + 1), []);

  const requestKey = JSON.stringify([
    symbol,
    providerId ?? null,
    selectedAddress ?? null,
    perpsNetwork,
    refreshKey ?? null,
    refreshCount,
  ]);

  useEffect(() => {
    let isCurrent = true;
    if (!enabled) {
      return () => {
        isCurrent = false;
      };
    }

    Engine.context.PerpsController.getMarginModeLock({ symbol, providerId })
      .then((lock) => {
        if (isCurrent) {
          setReadResult({ requestKey, lock });
        }
      })
      .catch(() => {
        if (isCurrent) {
          setReadResult({ requestKey, lock: null });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [enabled, requestKey, symbol, providerId]);

  const lock =
    enabled && readResult?.requestKey === requestKey ? readResult.lock : null;
  const isResolved = lock !== null && lock.status !== 'unavailable';

  return { lock, isResolved, refresh };
};
