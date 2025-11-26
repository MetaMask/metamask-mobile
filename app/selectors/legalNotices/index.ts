import { RootState } from '../../reducers';
import { selectIsPna25FlagEnabled } from '../featureFlagController/legalNotices';
import { MetaMetrics } from '../../core/Analytics';

const currentDate = new Date(Date.now());
const newPrivacyPolicyDate = new Date('2024-06-18T12:00:00Z');

export const shouldShowNewPrivacyToastSelector = (
  state: RootState,
): boolean => {
  const {
    newPrivacyPolicyToastShownDate,
    newPrivacyPolicyToastClickedOrClosed,
  } = state.legalNotices;

  if (newPrivacyPolicyToastClickedOrClosed) return false;

  const shownDate = new Date(newPrivacyPolicyToastShownDate || 0);

  const oneDayInMilliseconds = 24 * 60 * 60 * 1000;
  const isRecent =
    currentDate.getTime() - shownDate.getTime() < oneDayInMilliseconds;

  return (
    currentDate.getTime() >= newPrivacyPolicyDate.getTime() &&
    (!newPrivacyPolicyToastShownDate ||
      (isRecent && !newPrivacyPolicyToastClickedOrClosed))
  );
};

/**
 * Determines if the PNA25 toast should be shown based on:
 * - User has completed onboarding (completedOnboarding === true)
 * - User is not a social login user
 * - LaunchDarkly feature flag (extension-ux-pna25) is enabled (boolean)
 * - User is an existing user (pna25Acknowledged !== true)
 * - User has opted into metrics (participateInMetaMetrics === true)
 * New users will have pna25Acknowledged = true (PNA25 was shown during onboarding)
 * Existing users will have pna25Acknowledged = false (PNA25 didn't exist when they onboarded)
 *
 * @param state - Redux state
 * @returns Boolean indicating whether or not to show the PNA25 toast
 */
export const shouldShowPna25Toast = (state: RootState): boolean => {
  const { completedOnboarding } = state.onboarding;
  const { isPna25Acknowledged } = state.legalNotices;
  const { userId: socialLoginUserId } =
    state.engine.backgroundState.SeedlessOnboardingController;
  const isPna25Enabled = selectIsPna25FlagEnabled(state);

  const areMetametricsEnabled = MetaMetrics.getInstance().isEnabled();

  if (
    !completedOnboarding ||
    socialLoginUserId ||
    !isPna25Enabled ||
    isPna25Acknowledged
  ) {
    return false;
  }

  if (areMetametricsEnabled === false) {
    return false;
  }

  return true;
};
