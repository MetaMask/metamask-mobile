import { useCallback, useEffect, useRef, useState } from 'react';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import type { ReferralMeDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { REWARDS_MONEY_ENABLED } from '../constants';

export interface UseRewardsMoneyMeResult {
  me: ReferralMeDto | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * The bootstrap read behind every RewardsMoney screen.
 *
 * `GET /referral/me` is one round trip that answers which variant to render,
 * which rates to show and whether there is a code to share, so no screen has to
 * infer a role from the absence of data.
 *
 * @returns The payload, loading and error state, and a force-fresh refresh.
 */
export const useRewardsMoneyMe = (): UseRewardsMoneyMeResult => {
  const [me, setMe] = useState<ReferralMeDto | null>(null);
  const [isLoading, setIsLoading] = useState(REWARDS_MONEY_ENABLED);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const load = useCallback(async (forceFresh: boolean) => {
    if (!REWARDS_MONEY_ENABLED) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await Engine.controllerMessenger.call(
        'RewardsMoneyController:getReferralMe',
        { forceFresh },
      );
      if (isMountedRef.current) {
        setMe(result);
      }
    } catch (err) {
      Logger.log(
        'useRewardsMoneyMe: failed to load referral me',
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
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const refresh = useCallback(() => {
    load(true);
  }, [load]);

  return { me, isLoading, error, refresh };
};

export default useRewardsMoneyMe;
