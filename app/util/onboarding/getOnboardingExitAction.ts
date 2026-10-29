import { CommonActions } from '@react-navigation/native';
import type { AnyAction, Dispatch } from 'redux';
import Routes from '../../constants/navigation/Routes';
import type { ONBOARDING_SUCCESS_FLOW } from '../../constants/onboarding';
import type { RootState } from '../../reducers';
import { clearPendingReferralCode } from '../../reducers/rewardsMoney';
import { selectPendingMoneyReferralCode } from '../../reducers/rewardsMoney/selectors';
import { selectRewardsMoneyControllerEnabled } from '../../selectors/featureFlagController/rewardsMoneyController';
import { selectBasicFunctionalityEnabled } from '../../selectors/settings';
import { shouldMarkWalletHomeOnboardingStepsEligible } from './walletHomeOnboardingStepsEligibility';

export const resetToHomeAction = () =>
  CommonActions.reset({
    index: 0,
    routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
  });

interface GetOnboardingExitActionParams {
  /** Read after `finalizeOnboardingCompletion`, which may turn Basic Functionality on. */
  state: RootState;
  successFlow: ONBOARDING_SUCCESS_FLOW | undefined;
  dispatch: Dispatch<AnyAction>;
}

/**
 * Where a finished onboarding goes: the Money referral step when the wallet
 * arrived through a referral link, Home otherwise.
 *
 * Only first-time onboarding offers the step. There, a code the step cannot
 * offer — Basic Functionality off or Money disabled — is dropped rather than
 * left for the Home invite.
 */
export function getOnboardingExitAction({
  state,
  successFlow,
  dispatch,
}: GetOnboardingExitActionParams) {
  const referralCode = selectPendingMoneyReferralCode(state);
  if (
    !referralCode ||
    !successFlow ||
    !shouldMarkWalletHomeOnboardingStepsEligible(successFlow)
  ) {
    return resetToHomeAction();
  }

  if (
    !selectBasicFunctionalityEnabled(state) ||
    !selectRewardsMoneyControllerEnabled(state)
  ) {
    dispatch(clearPendingReferralCode());
    return resetToHomeAction();
  }

  return CommonActions.reset({
    index: 0,
    routes: [
      { name: Routes.ONBOARDING.MONEY_REFERRAL, params: { referralCode } },
    ],
  });
}
