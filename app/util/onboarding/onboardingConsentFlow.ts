import Routes from '../../constants/navigation/Routes';
import type { ONBOARDING_SUCCESS_FLOW } from '../../constants/onboarding';
import type { AppNavigationProp } from '../../core/NavigationService/types';

export type OnboardingConsentKind = 'srp' | 'social';

export interface OnboardingConsentFlowParams {
  kind: OnboardingConsentKind;
  onContinue?: () => void;
  accountType?: string;
  successFlow?: ONBOARDING_SUCCESS_FLOW;
}

type ConsentNavigation = Pick<AppNavigationProp, 'navigate'>;

/**
 * Starts the prototype consent sequence: push pre-prompt, then usage data
 * (SRP only) and marketing.
 */
export function navigateOnboardingConsentFlow(
  navigation: ConsentNavigation,
  params: OnboardingConsentFlowParams,
): void {
  navigation.navigate(Routes.ONBOARDING.PUSH_NOTIFICATIONS, params);
}

/**
 * Continues after the push pre-prompt (or a silent skip).
 */
export function navigateToNextOnboardingConsentStep(
  navigation: ConsentNavigation,
  params: OnboardingConsentFlowParams,
): void {
  if (params.kind === 'social') {
    navigation.navigate(Routes.ONBOARDING.MARKETING_CONSENT, params);
    return;
  }

  navigation.navigate(Routes.ONBOARDING.OPTIN_METRICS, params);
}

/**
 * Continues after the usage-data screen when basic usage is opted in.
 */
export function navigateToOnboardingMarketingConsent(
  navigation: ConsentNavigation,
  params: OnboardingConsentFlowParams,
): void {
  navigation.navigate(Routes.ONBOARDING.MARKETING_CONSENT, params);
}
