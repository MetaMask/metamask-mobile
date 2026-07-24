import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  mergePositionsForAccounts,
  type DeFiProtocolPositionGroup,
} from '@metamask/assets-controllers';
import Engine from '../../../../../../core/Engine';
import { selectDeFiPositionsV2State } from '../../../../../../selectors/defiPositionsControllerV2';
import { selectIsUnlocked } from '../../../../../../selectors/keyringController';
import {
  selectSelectedAccountGroupId,
  selectSelectedAccountGroupInternalAccounts,
} from '../../../../../../selectors/multichainAccounts/accountTreeController';

interface IdleCallbackGlobals {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout?: number },
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
}

const scheduleIdleTask = (task: () => void): (() => void) => {
  const idleGlobals = globalThis as typeof globalThis & IdleCallbackGlobals;

  if (idleGlobals.requestIdleCallback) {
    const idleCallbackId = idleGlobals.requestIdleCallback(task);
    return () => {
      idleGlobals.cancelIdleCallback?.(idleCallbackId);
    };
  }

  const timeoutId = setTimeout(task, 0);
  return () => {
    clearTimeout(timeoutId);
  };
};

export interface UseDeFiPositionsV2Options {
  /** Whether V2 DeFi is enabled for this surface. */
  enabled: boolean;
  /** Whether the DeFi section is currently in the scroll viewport. */
  isVisible: boolean;
}

export interface UseDeFiPositionsV2Result {
  /** Protocol groups for the selected account group, merged across accounts. */
  positions: DeFiProtocolPositionGroup[];
  /** True while the initial fetch is in flight and no positions exist yet. */
  isLoading: boolean;
  /** True when the fetch failed. */
  isError: boolean;
  /**
   * True after at least one fetch attempt has settled for the current account
   * group (success or error). Used to distinguish idle (never fetched) from
   * loaded-empty.
   */
  hasFetched: boolean;
  /**
   * Trigger a force-refresh fetch, bypassing the visibility gate and the
   * apiClient cache (e.g. pull-to-refresh).
   */
  refresh: () => Promise<void>;
}

/**
 * Drives DeFi V2 surfaces: fetches (without forceRefresh) when the section
 * enters the viewport — including while still empty/idle — and on account
 * group change while visible. Pull-to-refresh uses {@link refresh} with
 * `forceRefresh: true` to bypass the apiClient cache.
 *
 * @param options - Enablement and viewport visibility gates.
 * @returns Merged positions plus loading/error flags and a refresh helper.
 */
export function useDeFiPositionsV2({
  enabled,
  isVisible,
}: UseDeFiPositionsV2Options): UseDeFiPositionsV2Result {
  const isUnlocked = useSelector(selectIsUnlocked);
  const selectedAccountGroupId = useSelector(selectSelectedAccountGroupId);
  const groupAccounts = useSelector(selectSelectedAccountGroupInternalAccounts);
  const positionsByAccount = useSelector(selectDeFiPositionsV2State);

  const accountIds = useMemo(
    () => groupAccounts.map((account) => account.id),
    [groupAccounts],
  );

  const hasPositions = useMemo(
    () => accountIds.some((id) => positionsByAccount[id] !== undefined),
    [accountIds, positionsByAccount],
  );

  const [isFetching, setIsFetching] = useState(false);
  const [isError, setIsError] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [fetchedForGroupId, setFetchedForGroupId] = useState<string | null>(
    null,
  );

  // Re-arm idle/placeholder state when the selected account group changes.
  const hasFetchedForCurrentGroup =
    hasFetched && fetchedForGroupId === selectedAccountGroupId;

  const shouldFetch = enabled && isVisible && isUnlocked;

  const refresh = useMemo(
    () => async () => {
      if (!enabled || !isUnlocked) {
        return;
      }

      setIsFetching(true);
      setIsError(false);

      try {
        await Engine.context.DeFiPositionsControllerV2.fetchDeFiPositions({
          forceRefresh: true,
        });
      } catch {
        setIsError(true);
      } finally {
        setIsFetching(false);
        setHasFetched(true);
        setFetchedForGroupId(selectedAccountGroupId);
      }
    },
    [enabled, isUnlocked, selectedAccountGroupId],
  );

  useEffect(() => {
    if (!shouldFetch) {
      return;
    }

    let cancelled = false;

    const cancelIdleTask = scheduleIdleTask(() => {
      setIsFetching(true);
      setIsError(false);

      Engine.context.DeFiPositionsControllerV2.fetchDeFiPositions()
        .catch(() => {
          if (!cancelled) {
            setIsError(true);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsFetching(false);
            setHasFetched(true);
            setFetchedForGroupId(selectedAccountGroupId);
          }
        });
    });

    return () => {
      cancelled = true;
      cancelIdleTask();
    };
  }, [shouldFetch, selectedAccountGroupId]);

  const positions = useMemo(
    () => mergePositionsForAccounts(positionsByAccount, accountIds),
    [positionsByAccount, accountIds],
  );

  return {
    positions,
    isLoading: isFetching && !hasPositions,
    isError,
    hasFetched: hasFetchedForCurrentGroup,
    refresh,
  };
}

export default useDeFiPositionsV2;
