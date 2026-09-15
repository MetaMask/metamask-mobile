import type { ONBOARDING_SUCCESS_FLOW } from '../../../constants/onboarding';
import type { OnboardingConsentKind } from '../../../util/onboarding/onboardingConsentFlow';

export interface OptinMetricsRouteParams {
  kind?: OnboardingConsentKind;
  onContinue?: () => void;
  accountType?: string;
  successFlow?: ONBOARDING_SUCCESS_FLOW;
}

export interface LinkParams {
  url: string;
  title: string;
}
