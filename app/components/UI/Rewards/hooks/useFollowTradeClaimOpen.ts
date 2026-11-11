import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { setCommissionMechanisms } from '../../../../reducers/rewardsMoney';
import { selectCommissionMechanisms } from '../../../../reducers/rewardsMoney/selectors';
import type { RootState } from '../../../../reducers';
import type { CommissionsPageDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { FOLLOW_TRADE_COMMISSIONS_ORIGIN } from './useCommissions';

/**
 * Claim routes from this session's commissions page. Until that page
 * arrives, both stay closed. Cashback is not one of these flags.
 */
export function useClaimMechanisms(profileId: string | undefined): {
  followTradeClaimOpen: boolean;
  revShareClaimOpen: boolean;
} {
  const dispatch = useDispatch();
  const mechanisms = useSelector((state: RootState) =>
    selectCommissionMechanisms(state, profileId),
  );

  useEffect(() => {
    if (!profileId || mechanisms) {
      return undefined;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const page: CommissionsPageDto = await Engine.controllerMessenger.call(
          'RewardsMoneyController:getCommissions',
          { originType: FOLLOW_TRADE_COMMISSIONS_ORIGIN },
        );
        if (cancelled || !page?.mechanisms) {
          return;
        }
        dispatch(
          setCommissionMechanisms({
            profileId,
            mechanisms: page.mechanisms,
          }),
        );
      } catch {
        // Follow-trade stays off until a commissions page arrives.
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [dispatch, mechanisms, profileId]);

  return {
    followTradeClaimOpen: mechanisms?.SOCIAL_FOLLOW_TRADE?.claim_open === true,
    revShareClaimOpen: mechanisms?.REFERRAL_REV_SHARE?.claim_open === true,
  };
}

/** Whether `SOCIAL_FOLLOW_TRADE.claim_open` is true for this session. */
export function useFollowTradeClaimOpen(
  profileId: string | undefined,
): boolean {
  return useClaimMechanisms(profileId).followTradeClaimOpen;
}
