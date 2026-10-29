import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { REFERRAL_ME_CACHE_THRESHOLD_MS } from '../../../../core/Engine/controllers/rewards-money-controller/RewardsMoneyController';
import type { ReferralMeDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { setReferralMe } from '../../../../reducers/rewardsMoney';
import { selectRewardsMoneyControllerEnabled } from '../../../../selectors/featureFlagController/rewardsMoneyController';

/**
 * Warms `GET /referral/me` once the main app is up, so the Rewards tab does
 * not start that lookup on first open.
 *
 * A fresh controller cache is copied into Redux and not fetched again. A
 * failed warm-up writes nothing, so the tab's own error and skeleton
 * behavior is unchanged. The candidate subscription is prefetched separately
 * by `useCandidateSubscriptionId` on the same screen.
 *
 * Points opt-in is not a gate. Someone who never opted into points can still
 * be a money referee, and this payload is what opens their home. Gating on
 * opt-in would put that first open back on the cold read.
 */
export function usePrefetchRewardsIdentity(): void {
  const dispatch = useDispatch();
  const moneyEnabled = useSelector(selectRewardsMoneyControllerEnabled);

  useEffect(() => {
    if (!moneyEnabled) {
      return undefined;
    }

    let active = true;

    const warmReferralMe = async () => {
      let profileId: string | undefined;
      try {
        const profile = await Engine.controllerMessenger.call(
          'AuthenticationController:getSessionProfile',
        );
        profileId = profile?.profileId;
      } catch {
        return;
      }
      if (!active || !profileId) {
        return;
      }

      const cached =
        Engine.context.RewardsMoneyController.state.referralMe[profileId];
      const fresh =
        Boolean(cached?.payload) &&
        Date.now() - (cached?.lastFetched ?? 0) <
          REFERRAL_ME_CACHE_THRESHOLD_MS;

      if (fresh && cached?.payload) {
        dispatch(setReferralMe({ profileId, data: cached.payload }));
        return;
      }

      try {
        const referralMe: ReferralMeDto = await Engine.controllerMessenger.call(
          'RewardsMoneyController:getReferralMe',
        );
        if (!active) {
          return;
        }
        const current = await Engine.controllerMessenger.call(
          'AuthenticationController:getSessionProfile',
        );
        if (!active || current?.profileId !== profileId) {
          return;
        }
        dispatch(setReferralMe({ profileId, data: referralMe }));
      } catch {
        // Leave Redux untouched. The tab still settles this lookup itself.
      }
    };

    void warmReferralMe();

    return () => {
      active = false;
    };
  }, [dispatch, moneyEnabled]);
}
