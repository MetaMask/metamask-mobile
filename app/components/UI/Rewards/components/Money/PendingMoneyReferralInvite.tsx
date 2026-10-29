import React, { useEffect } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import type { RootState } from '../../../../../reducers';
import { clearPendingReferralCode } from '../../../../../reducers/rewardsMoney';
import {
  canAcceptMoneyReferralInvite,
  selectMoneyReferralAllowedForGeo,
  selectPendingMoneyReferralCode,
  selectReferralMeEntry,
} from '../../../../../reducers/rewardsMoney/selectors';
import { selectBasicFunctionalityEnabled } from '../../../../../selectors/settings';
import { selectRewardsMoneyControllerEnabled } from '../../../../../selectors/featureFlagController/rewardsMoneyController';
import NavigationService from '../../../../../core/NavigationService';
import Routes from '../../../../../constants/navigation/Routes';
import { useGeoRewardsMetadata } from '../../hooks/useGeoRewardsMetadata';
import { useReferralMe } from '../../hooks/useReferralMe';
import { runAfterInteractions } from '../../utils/runAfterInteractions';

interface PresenterProps {
  referralCode: string;
}

/**
 * Reads referral me fresh, then opens the invite sheet over whatever the
 * deeplink navigated to. The sheet reads the payload from the store, so it
 * opens with its copy instead of waiting on an empty one. A user who cannot
 * accept an invite, a confirmed excluded region, or a failed read drops the
 * code without a prompt.
 */
const PendingMoneyReferralInvitePresenter = ({
  referralCode,
}: PresenterProps) => {
  const dispatch = useDispatch();
  const store = useStore<RootState>();
  useGeoRewardsMetadata({ enabled: true });
  const { fetchReferralMe } = useReferralMe({ fetchOnMount: false });

  useEffect(() => {
    let cancelled = false;
    const dropCode = () => {
      if (!cancelled) {
        dispatch(clearPendingReferralCode());
      }
    };

    const handle = runAfterInteractions(() => {
      fetchReferralMe({ forceFresh: true })
        .then((result) => {
          if (cancelled) {
            return;
          }
          // A newer link while the sheet is open is not a second prompt.
          if (
            NavigationService.getCurrentRoute()?.name ===
            Routes.MODAL.REWARDS_MONEY_INVITE_SHEET
          ) {
            return;
          }
          const state = store.getState();
          const referralMe =
            result.status === 'settled'
              ? selectReferralMeEntry(state, result.profileId)?.data
              : null;
          if (
            !referralMe ||
            !canAcceptMoneyReferralInvite(referralMe) ||
            !selectMoneyReferralAllowedForGeo(state, result.profileId)
          ) {
            dropCode();
            return;
          }
          NavigationService.navigation.navigate(
            Routes.MODAL.REWARDS_MONEY_INVITE_SHEET,
            { referralCode },
          );
        })
        .catch(dropCode);
    });

    return () => {
      cancelled = true;
      handle.cancel();
    };
  }, [dispatch, fetchReferralMe, referralCode, store]);

  return null;
};

/**
 * Offers the referral code a deeplink left behind, once the wallet is unlocked
 * and onboarded. Mounted with the main navigator, so new users see the invite
 * right after onboarding and existing users see it over the link's
 * destination. Without basic functionality or the Rewards Money surface the
 * invite cannot be validated, so the code is dropped.
 */
const PendingMoneyReferralInvite = () => {
  const dispatch = useDispatch();
  const referralCode = useSelector(selectPendingMoneyReferralCode);
  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );
  const isRewardsMoneyEnabled = useSelector(
    selectRewardsMoneyControllerEnabled,
  );
  const canOfferInvite = Boolean(
    isBasicFunctionalityEnabled && isRewardsMoneyEnabled,
  );

  useEffect(() => {
    if (referralCode && !canOfferInvite) {
      dispatch(clearPendingReferralCode());
    }
  }, [canOfferInvite, dispatch, referralCode]);

  if (!referralCode || !canOfferInvite) {
    return null;
  }

  return <PendingMoneyReferralInvitePresenter referralCode={referralCode} />;
};

export default PendingMoneyReferralInvite;
