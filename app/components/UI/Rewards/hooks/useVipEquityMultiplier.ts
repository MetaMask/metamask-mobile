import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import type { VipEquityMultiplierAvailableDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectVipProgramEnabled } from '../../../../selectors/featureFlagController/vipProgram';
import { useSubscriptionLinkedMusdHoldings } from './useSubscriptionLinkedMusdHoldings';

const HOLDINGS_DEBOUNCE_MS = 1000;

export type VipEquityMultiplierStatus =
  | 'hidden'
  | 'loading'
  | 'error'
  | 'ready';

interface VipEquityMultiplierSnapshot {
  payload: VipEquityMultiplierAvailableDto;
  holdingsUsd: string;
}

export interface UseVipEquityMultiplierResult {
  /**
   * `hidden` — the surface does not apply (not enrolled, VIP off, or the
   * program has no band configured). `loading` / `error` are user-visible so
   * that a transient failure is distinguishable from "you do not qualify".
   */
  status: VipEquityMultiplierStatus;
  data: VipEquityMultiplierAvailableDto | null;
  /**
   * The holdings `data` was computed from — never from the API. Paired with
   * `data` so the radial label cannot describe a different balance than the
   * arc while a refetch is in flight.
   */
  holdingsUsd: string | undefined;
  retry: () => void;
}

/**
 * Fetches the display-only VIP equity multiplier for linked mUSD holdings.
 *
 * Debounces holdings changes (leading edge on the first value, so the section
 * does not sit blank for a full window on every visit); the controller cache
 * absorbs VIP focus re-entry. Does not gate on client `features.vip.enabled` —
 * that flag can be stale; enrollment is enforced by the backend (404 → hidden).
 */
export const useVipEquityMultiplier = (): UseVipEquityMultiplierResult => {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isVipProgramEnabled = useSelector(selectVipProgramEnabled);
  const {
    holdingsUsd,
    isLoading: isHoldingsLoading,
    hasError: hasHoldingsError,
    retry: retryHoldings,
  } = useSubscriptionLinkedMusdHoldings();

  const [snapshot, setSnapshot] = useState<VipEquityMultiplierSnapshot | null>(
    null,
  );
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [hasFetchError, setHasFetchError] = useState(false);
  /**
   * True from the moment `retry` is invoked until the resulting request
   * settles. Without it, clearing `hasFetchError` would immediately re-expose
   * the previous snapshot and flash a stale multiplier mid-retry.
   */
  const [isRetryPending, setIsRetryPending] = useState(false);
  const [debouncedHoldings, setDebouncedHoldings] = useState<
    string | undefined
  >(undefined);

  const requestIdRef = useRef(0);
  const inFlightHoldingsRef = useRef<string | undefined>(undefined);
  const hasSeenHoldingsRef = useRef(false);

  useEffect(() => {
    if (holdingsUsd === undefined) {
      return undefined;
    }
    // Leading edge for the first resolved value; trailing debounce afterwards.
    if (!hasSeenHoldingsRef.current) {
      hasSeenHoldingsRef.current = true;
      setDebouncedHoldings(holdingsUsd);
      return undefined;
    }
    const timer = setTimeout(() => {
      setDebouncedHoldings(holdingsUsd);
    }, HOLDINGS_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [holdingsUsd]);

  const fetchMultiplier = useCallback(async (): Promise<void> => {
    if (!subscriptionId || !isVipProgramEnabled) {
      setIsUnavailable(true);
      setIsRetryPending(false);
      return;
    }
    if (debouncedHoldings === undefined) {
      // Holdings are still unresolved — a retry stays pending until they
      // either arrive (triggering this again) or fail.
      return;
    }
    // Dedupe re-entrant calls for the same holdings (focus + mount effect).
    // A different holdings value must supersede instead of being dropped,
    // otherwise the displayed progress would describe a stale balance.
    if (inFlightHoldingsRef.current === debouncedHoldings) {
      return;
    }
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    inFlightHoldingsRef.current = debouncedHoldings;
    try {
      const result = await Engine.controllerMessenger.call(
        'RewardsController:getVipEquityMultiplier',
        subscriptionId,
        debouncedHoldings,
      );
      if (requestId !== requestIdRef.current) {
        return;
      }
      setHasFetchError(false);
      setIsRetryPending(false);
      if (result?.available === true) {
        setIsUnavailable(false);
        setSnapshot({ payload: result, holdingsUsd: debouncedHoldings });
      } else {
        // `available: false` (no band configured) and 404 → null (not
        // enrolled) both mean the surface does not apply — not a failure.
        setIsUnavailable(true);
        setSnapshot(null);
      }
    } catch {
      if (requestId === requestIdRef.current) {
        setHasFetchError(true);
        setIsRetryPending(false);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        inFlightHoldingsRef.current = undefined;
      }
    }
  }, [subscriptionId, isVipProgramEnabled, debouncedHoldings]);

  useFocusEffect(
    useCallback(() => {
      fetchMultiplier().then();
    }, [fetchMultiplier]),
  );

  useEffect(() => {
    fetchMultiplier().then();
  }, [fetchMultiplier]);

  const retry = useCallback(() => {
    inFlightHoldingsRef.current = undefined;
    setIsRetryPending(true);
    setHasFetchError(false);
    // Holdings can be the failing input, in which case re-requesting the
    // multiplier alone would never recover. Refetching them re-runs this
    // effect chain once a new value lands.
    retryHoldings();
    fetchMultiplier().then();
  }, [retryHoldings, fetchMultiplier]);

  let status: VipEquityMultiplierStatus = 'loading';
  if (!subscriptionId || !isVipProgramEnabled || isUnavailable) {
    status = 'hidden';
  } else if (hasHoldingsError || hasFetchError) {
    // Prefer an explicit error over a stale estimate: the previous snapshot
    // describes a balance we can no longer confirm.
    status = 'error';
  } else if (snapshot && !isHoldingsLoading && !isRetryPending) {
    status = 'ready';
  }

  return {
    status,
    data: status === 'ready' ? (snapshot?.payload ?? null) : null,
    holdingsUsd: status === 'ready' ? snapshot?.holdingsUsd : undefined,
    retry,
  };
};

export default useVipEquityMultiplier;
