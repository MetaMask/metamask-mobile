import React, { useEffect } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import type { RootState } from '../../../../../reducers';
import { clearPendingReferralCode } from '../../../../../reducers/rewardsMoney';
import {
  canAcceptMoneyReferralInvite,
  selectIsReferralLinkPending,
  selectMoneyReferralAllowedForGeo,
  selectPendingMoneyReferralCode,
  selectReferralMeEntry,
} from '../../../../../reducers/rewardsMoney/selectors';
import { selectBasicFunctionalityEnabled } from '../../../../../selectors/settings';
import { selectRewardsMoneyControllerEnabled } from '../../../../../selectors/featureFlagController/rewardsMoneyController';
import NavigationService from '../../../../../core/NavigationService';
import Routes from '../../../../../constants/navigation/Routes';
import { detectAppInstallation } from '../../../../../core/DeeplinkManager/util/deeplinks/deepLinkAnalytics';
import { useGeoRewardsMetadata } from '../../hooks/useGeoRewardsMetadata';
import { useReferralMe } from '../../hooks/useReferralMe';
import { runAfterInteractions } from '../../utils/runAfterInteractions';

/**
 * How long the referral me read may take before the code is dropped. The push
 * pre-prompt waits on the code, so a slow read must not hold it all session.
 */
export const MONEY_REFERRAL_INVITE_LOAD_BUDGET_MS = 5000;

interface PresenterProps {
  referralCode: string;
}

/**
 * Reads referral me fresh, then opens the invite sheet over whatever the
 * deeplink navigated to. The sheet reads the payload from the store, so it
 * opens with its copy instead of waiting on an empty one. A first session
 * after installing from a Branch link opens it as `restored_context`. A user
 * who cannot accept an invite, a confirmed excluded region, a failed read, or
 * a read slower than the load budget drops the code without a prompt.
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
    let budgetTimer: ReturnType<typeof setTimeout> | undefined;
    const dropCode = () => {
      if (!cancelled) {
        cancelled = true;
        dispatch(clearPendingReferralCode());
      }
    };

    const handle = runAfterInteractions(() => {
      if (cancelled) {
        return;
      }
      budgetTimer = setTimeout(dropCode, MONEY_REFERRAL_INVITE_LOAD_BUDGET_MS);
      Promise.all([
        fetchReferralMe({ forceFresh: true }),
        detectAppInstallation(),
      ])
        .then(([result, wasAppInstalled]) => {
          if (cancelled) {
            return;
          }
          clearTimeout(budgetTimer);
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
            {
              referralCode,
              entryType: wasAppInstalled ? 'deeplink' : 'restored_context',
            },
          );
        })
        .catch(dropCode);
    });

    return () => {
      cancelled = true;
      handle.cancel();
      clearTimeout(budgetTimer);
    };
  }, [dispatch, fetchReferralMe, referralCode, store]);

  return null;
};

/**
 * Offers the referral code a deeplink left behind, once the wallet is unlocked
 * and onboarded. Mounted with the main navigator, and held until the link is
 * handled, so the invite opens over the link's destination rather than the
 * interstitial. Without basic functionality or the Rewards Money surface the
 * invite cannot be validated, so the code is dropped.
 */
const PendingMoneyReferralInvite = () => {
  const dispatch = useDispatch();
  const referralCode = useSelector(selectPendingMoneyReferralCode);
  const isReferralLinkPending = useSelector(selectIsReferralLinkPending);
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

  if (!referralCode || !canOfferInvite || isReferralLinkPending) {
    return null;
  }

  return <PendingMoneyReferralInvitePresenter referralCode={referralCode} />;
};

export default PendingMoneyReferralInvite;
