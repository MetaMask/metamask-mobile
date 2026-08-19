import { REWARDS_VIEW_SELECTORS } from '../../../app/components/UI/Rewards/Views/RewardsView.constants';
import Matchers from '../../framework/Matchers';
import type { EncapsulatedElementType } from '../../framework/EncapsulatedElement';

/** Root container for Rewards onboarding (`OnboardingMainStep`). */
export const REWARDS_ONBOARDING_STEP_CONTAINER = 'onboarding-step-container';

/**
 * Rewards tab content surface.
 *
 * Non-opted-in accounts land on onboarding; opted-in accounts land on the
 * dashboard shell. Permanent dashboard body content is still evolving, so
 * performance gates should treat either of these as "content ready".
 */
class RewardsView {
  get title(): EncapsulatedElementType {
    return Matchers.getElementByID(REWARDS_VIEW_SELECTORS.TITLE);
  }

  get safeArea(): EncapsulatedElementType {
    return Matchers.getElementByID(REWARDS_VIEW_SELECTORS.SAFE_AREA_VIEW);
  }

  get onboardingStepContainer(): EncapsulatedElementType {
    return Matchers.getElementByID(REWARDS_ONBOARDING_STEP_CONTAINER);
  }
}

export default new RewardsView();
