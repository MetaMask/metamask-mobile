import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import type {
  EarningOriginType,
  EarningsSummaryDto,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { REWARDS_MONEY_ENABLED } from '../../constants';
import useRewardsMoneyEvents from '../../hooks/useRewardsMoneyEvents';

const EARNINGS_EVENTS = ['RewardsMoneyController:earningsUpdated'] as const;

export interface UseEarningsSummaryResult {
  summary: EarningsSummaryDto | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Scoped earnings summary for a screen's origin-type set.
 *
 * The same `originTypes` go to the summary, the ledger and the claim, so the
 * headline number and what a claim pays are the same number by construction.
 *
 * @param originTypes - The scope for this screen.
 * @returns The summary, loading and error state, and a force-fresh refresh.
 */
export const useEarningsSummary = (
  originTypes: EarningOriginType[],
): UseEarningsSummaryResult => {
  const [summary, setSummary] = useState<EarningsSummaryDto | null>(null);
  const [isLoading, setIsLoading] = useState(REWARDS_MONEY_ENABLED);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  // Callers pass an array literal, so key on the contents rather than identity.
  const scopeKey = useMemo(
    () => [...originTypes].sort().join(','),
    [originTypes],
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const load = useCallback(
    async (forceFresh: boolean) => {
      if (!REWARDS_MONEY_ENABLED) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await Engine.controllerMessenger.call(
          'RewardsMoneyController:getEarningsSummary',
          {
            originTypes: scopeKey
              ? (scopeKey.split(',') as EarningOriginType[])
              : [],
            forceFresh,
          },
        );
        if (isMountedRef.current) {
          setSummary(result);
        }
      } catch (err) {
        Logger.log(
          'useEarningsSummary: failed to load summary',
          err instanceof Error ? err.message : String(err),
        );
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to load');
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [scopeKey],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const refresh = useCallback(() => {
    load(true);
  }, [load]);

  useRewardsMoneyEvents(EARNINGS_EVENTS, refresh);

  return { summary, isLoading, error, refresh };
};

export default useEarningsSummary;
