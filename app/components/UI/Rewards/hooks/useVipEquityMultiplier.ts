import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import type { VipEquityMultiplierAvailableDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectVipProgramEnabled } from '../../../../selectors/featureFlagController/vipProgram';
import { useSubscriptionLinkedMusdHoldings } from './useSubscriptionLinkedMusdHoldings';

const HOLDINGS_DEBOUNCE_MS = 1000;

export interface UseVipEquityMultiplierResult {
  /** When false, the section must not render (no skeleton). */
  shouldRender: boolean;
  data: VipEquityMultiplierAvailableDto | null;
  /** Local wallet holdings used for the POST body / radial label — never from API. */
  holdingsUsd: string | undefined;
}

/**
 * Fetches display-only VIP equity multiplier for linked-in-wallet holdings.
 * Debounces holdings changes; controller cache absorbs VIP focus re-entry.
 * Does not gate on client `features.vip.enabled` — that flag can be stale;
 * enrollment is enforced by the backend (404 → hide).
 */
export const useVipEquityMultiplier = (): UseVipEquityMultiplierResult => {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isVipProgramEnabled = useSelector(selectVipProgramEnabled);
  const { holdingsUsd } = useSubscriptionLinkedMusdHoldings();

  const [data, setData] = useState<VipEquityMultiplierAvailableDto | null>(
    null,
  );
  const [shouldRender, setShouldRender] = useState(false);
  const [debouncedHoldings, setDebouncedHoldings] = useState<
    string | undefined
  >(undefined);
  const isLoadingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedHoldings(holdingsUsd);
    }, HOLDINGS_DEBOUNCE_MS);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [holdingsUsd]);

  const fetchMultiplier = useCallback(async (): Promise<void> => {
    if (
      !subscriptionId ||
      !isVipProgramEnabled ||
      debouncedHoldings === undefined
    ) {
      setShouldRender(false);
      return;
    }
    if (isLoadingRef.current) {
      return;
    }
    isLoadingRef.current = true;
    try {
      const result = await Engine.controllerMessenger.call(
        'RewardsController:getVipEquityMultiplier',
        subscriptionId,
        debouncedHoldings,
      );
      if (result?.available === true) {
        setData(result);
        setShouldRender(true);
      } else {
        setShouldRender(false);
      }
    } catch {
      setShouldRender(false);
    } finally {
      isLoadingRef.current = false;
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

  return {
    shouldRender: shouldRender && data !== null,
    data: shouldRender ? data : null,
    holdingsUsd: debouncedHoldings,
  };
};

export default useVipEquityMultiplier;
