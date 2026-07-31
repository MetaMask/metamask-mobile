import { useABTest } from './useABTest';
import {
  ONBOARDING_INTEREST_QUESTIONNAIRE_AB_KEY,
  ONBOARDING_INTEREST_QUESTIONNAIRE_AB_TEST_EXPOSURE_OPTIONS,
  ONBOARDING_INTEREST_QUESTIONNAIRE_VARIANTS,
} from '../components/Views/OnboardingInterestQuestionnaire/abTestConfig';

/**
 * Returns whether the onboarding interest questionnaire should be shown,
 * driven by the LaunchDarkly A/B test flag
 * `tradeTO880AbtestOnboardingInterestQuestion`.
 *
 * - `control` (default/fallback): questionnaire is **not** shown.
 * - `treatment`: questionnaire **is** shown.
 *
 * The rollout percentage is controlled entirely from LaunchDarkly —
 * no code change needed to adjust from 25% to 50% to 100%.
 */
export function useOnboardingInterestQuestionnaireEligibility() {
  const { variant, variantName, isActive } = useABTest(
    ONBOARDING_INTEREST_QUESTIONNAIRE_AB_KEY,
    ONBOARDING_INTEREST_QUESTIONNAIRE_VARIANTS,
    ONBOARDING_INTEREST_QUESTIONNAIRE_AB_TEST_EXPOSURE_OPTIONS,
  );

  return {
    shouldShowQuestionnaire: variant.showQuestionnaire,
    variantName,
    isActive,
  };
}
