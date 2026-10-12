import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type {
  PerpsMarginModeLock,
  PerpsProviderType,
} from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import { selectPerpsSelectedAccountAddress } from '../selectors/selectedAccountAddress';
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
  /**
   * Venue answer for the current market, account and network; null while
   * unknown. During a refresh it keeps the previous answer for the same
   * context, so the displayed mode does not flicker.
   */
  lock: PerpsMarginModeLock | null;
  /**
   * True once the venue answered `locked` or `unlocked` for the current
   * request. False while a read is pending, after a failed read, or when the
   * venue reports the lock as unavailable.
   */
  isResolved: boolean;
  /** True while the read for the current request has not answered yet. */
  isPending: boolean;
  /** Re-read the lock, e.g. before the trader changes the margin mode. */
  refresh: () => void;
}

interface LockReadResult {
  contextKey: string;
  requestKey: string;
  lock: PerpsMarginModeLock | null;
}

/**
 * Reads the margin mode the venue has bound to a market through an open
 * position or resting order/TWAP, so the picker offers only a placeable mode.
 * An answer is resolved only for the market, account, network and refresh it
 * was read for. A refresh in the same context keeps showing the previous
 * answer until the new one arrives; any other change reads as unknown.
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
  const selectedAddress = useSelector(selectPerpsSelectedAccountAddress);
  const perpsNetwork = useSelector(selectPerpsNetwork);
  const [refreshCount, setRefreshCount] = useState(0);
  const [readResult, setReadResult] = useState<LockReadResult | null>(null);
  const refresh = useCallback(() => setRefreshCount((count) => count + 1), []);

  const contextKey = JSON.stringify([
    symbol,
    providerId ?? null,
    selectedAddress ?? null,
    perpsNetwork,
  ]);
  const requestKey = JSON.stringify([
    contextKey,
    refreshKey ?? null,
    refreshCount,
  ]);

  useEffect(() => {
    let isCurrent = true;
    if (!enabled) {
      // Drop the old answer so re-enabling reads as unknown until a fresh read.
      setReadResult(null);
      return () => {
        isCurrent = false;
      };
    }

    Engine.context.PerpsController.getMarginModeLock({ symbol, providerId })
      .then((lock) => {
        if (isCurrent) {
          setReadResult({ contextKey, requestKey, lock });
        }
      })
      // Defensive: the controller reports failures as `unavailable` instead of
      // throwing, so a rejection is treated the same way (lock unknown).
      .catch(() => {
        if (isCurrent) {
          setReadResult({ contextKey, requestKey, lock: null });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [enabled, contextKey, requestKey, symbol, providerId]);

  const isAnswered = enabled && readResult?.requestKey === requestKey;
  const isSameContext = enabled && readResult?.contextKey === contextKey;
  const lock = isSameContext && readResult ? readResult.lock : null;
  // Only the answer to the current request resolves the lock; a kept answer
  // from before a refresh is shown but stays unresolved.
  const isResolved =
    isAnswered && lock !== null && lock.status !== 'unavailable';
  const isPending = enabled && !isAnswered;

  return { lock, isResolved, isPending, refresh };
};
