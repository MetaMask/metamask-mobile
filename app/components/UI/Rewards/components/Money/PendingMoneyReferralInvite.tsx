import React, { useEffect } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import type { RootState } from '../../../../../reducers';
import { clearPendingReferralCode } from '../../../../../reducers/rewardsMoney';
import {
  selectAnsweredMoneyReferralCode,
  selectIsReferralLinkPending,
  selectPendingMoneyReferralCode,
  selectReferralMeEntry,
  canAcceptMoneyReferralInvite,
  selectMoneyReferralAllowedForGeo,
} from '../../../../../reducers/rewardsMoney/selectors';
import { selectBasicFunctionalityEnabled } from '../../../../../selectors/settings';
import { selectRewardsMoneyControllerEnabled } from '../../../../../selectors/featureFlagController/rewardsMoneyController';
import NavigationService from '../../../../../core/NavigationService';
import Routes from '../../../../../constants/navigation/Routes';
import { detectAppInstallation } from '../../../../../core/DeeplinkManager/util/deeplinks/deepLinkAnalytics';
import { useReferralMe } from '../../hooks/useReferralMe';
import { runAfterInteractions } from '../../utils/runAfterInteractions';
import { usePendingSocialPreviewTarget } from '../../../../Views/SocialLeaderboard/TraderPreviewSheet/pendingSocialPreviewTarget';

/**
 * How long the deeplink invite presenter and Social trader preview wait for
 * referral-me before proceeding. The push pre-prompt waits on the code, so a
 * slow read must not hold it all session.
 */
export const MONEY_REFERRAL_INVITE_LOAD_BUDGET_MS = 5000;

/**
 * Branch can hang. Bound app-installation detection so it cannot delay the
 * invite. On timeout, assume the app was installed, matching the detection
 * function's error default. A slow Branch response can then only affect the
 * analytics entry type.
 */
export const MONEY_REFERRAL_APP_INSTALLATION_TIMEOUT_MS = 500;

const detectAppInstallationWithTimeout = async (): Promise<boolean> =>
  new Promise<boolean>((resolve) => {
    const timer = setTimeout(
      () => resolve(true),
      MONEY_REFERRAL_APP_INSTALLATION_TIMEOUT_MS,
    );
    detectAppInstallation()
      .then((wasAppInstalled) => {
        clearTimeout(timer);
        resolve(wasAppInstalled);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(true);
      });
  });

interface PresenterProps {
  referralCode: string;
}

/**
 * Reads referral me fresh, then opens the invite sheet over the deeplink
 * destination. A first session after installing from a Branch link opens it
 * as `restored_context`. A user
 * who cannot accept an invite or a confirmed excluded region drops the code.
 * If eligibility cannot be confirmed, the sheet owns the final outcome.
 */
const PendingMoneyReferralInvitePresenter = ({
  referralCode,
}: PresenterProps) => {
  const dispatch = useDispatch();
  const store = useStore<RootState>();
  const { fetchReferralMe } = useReferralMe({ fetchOnMount: false });
  const answeredReferralCode = useSelector(selectAnsweredMoneyReferralCode);

  useEffect(() => {
    let cancelled = false;
    let budgetTimer: ReturnType<typeof setTimeout> | undefined;
    const dropCode = () => {
      if (!cancelled) {
        cancelled = true;
        dispatch(clearPendingReferralCode());
      }
    };

    const openInvite = (wasAppInstalled: boolean) => {
      if (cancelled) {
        return;
      }
      cancelled = true;
      clearTimeout(budgetTimer);
      if (
        NavigationService.getCurrentRoute()?.name ===
        Routes.MODAL.REWARDS_MONEY_INVITE_SHEET
      ) {
        return;
      }
      NavigationService.navigation.navigate(
        Routes.MODAL.REWARDS_MONEY_INVITE_SHEET,
        {
          referralCode,
          entryType: wasAppInstalled ? 'deeplink' : 'restored_context',
        },
      );
    };

    const handle = runAfterInteractions(() => {
      if (cancelled) {
        return;
      }
      let wasAppInstalled = true;
      const appInstallationPromise = detectAppInstallationWithTimeout().then(
        (appInstalled) => {
          wasAppInstalled = appInstalled;
          return appInstalled;
        },
      );
      budgetTimer = setTimeout(
        () => openInvite(wasAppInstalled),
        MONEY_REFERRAL_INVITE_LOAD_BUDGET_MS,
      );
      Promise.all([
        fetchReferralMe({ forceFresh: true }).catch(() => undefined),
        appInstallationPromise,
      ])
        .then(([result, appInstalled]) => {
          if (cancelled) {
            return;
          }
          clearTimeout(budgetTimer);
          if (
            NavigationService.getCurrentRoute()?.name ===
            Routes.MODAL.REWARDS_MONEY_INVITE_SHEET
          ) {
            return;
          }
          const state = store.getState();
          const referralMeEntry =
            result?.status === 'settled'
              ? selectReferralMeEntry(state, result.profileId)
              : undefined;
          const referralMe =
            referralMeEntry && !referralMeEntry.error
              ? referralMeEntry.data
              : null;
          if (
            referralMe &&
            (!canAcceptMoneyReferralInvite(referralMe) ||
              !selectMoneyReferralAllowedForGeo(state, result.profileId))
          ) {
            dropCode();
            return;
          }
          // A newer link while the sheet is open is not a second prompt. The
          // sheet answers its own code when it closes, which runs this again
          // for the newer one.
          openInvite(appInstalled);
        })
        .catch((): void => openInvite(wasAppInstalled));
    });

    return () => {
      cancelled = true;
      handle.cancel();
      clearTimeout(budgetTimer);
    };
  }, [answeredReferralCode, dispatch, fetchReferralMe, referralCode, store]);

  return null;
};

/**
 * Whether the invite should stay hidden for now. The code is kept, so the
 * invite opens once the hold ends.
 *
 * It is held while the deeplink that carried the code is still being handled,
 * so the invite opens over the link's destination rather than the
 * interstitial.
 *
 * It is also held while the Social trader preview is open. A Social link
 * opened before joining Social offers the code in that preview, which answers
 * the code when it closes, so the invite never follows it.
 *
 * @returns True while the invite should wait.
 */
const useShouldHoldReferralInvite = (): boolean => {
  const isReferralLinkPending = useSelector(selectIsReferralLinkPending);
  const isSocialPreviewOpen =
    usePendingSocialPreviewTarget()?.stage === 'previewing';
  return isReferralLinkPending || isSocialPreviewOpen;
};

/**
 * Offers the referral code a deeplink left behind, once the wallet is unlocked
 * and onboarded. Mounted with the main navigator. Without basic functionality
 * or the Rewards Money surface the invite cannot be validated, so the code is
 * dropped.
 */
const PendingMoneyReferralInvite = () => {
  const dispatch = useDispatch();
  const referralCode = useSelector(selectPendingMoneyReferralCode);
  const shouldHoldInvite = useShouldHoldReferralInvite();
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

  if (!referralCode || !canOfferInvite || shouldHoldInvite) {
    return null;
  }

  return <PendingMoneyReferralInvitePresenter referralCode={referralCode} />;
};

export default PendingMoneyReferralInvite;
