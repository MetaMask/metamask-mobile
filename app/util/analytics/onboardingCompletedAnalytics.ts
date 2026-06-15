export const ONBOARDING_IMPLEMENTATION_TYPE_NATIVE = 'native' as const;

export const ONBOARDING_TYPE_SEED_PHRASE = 'seed_phrase' as const;
export const ONBOARDING_TYPE_SOCIAL_LOGIN = 'social_login' as const;

export type OnboardingType =
  | typeof ONBOARDING_TYPE_SEED_PHRASE
  | typeof ONBOARDING_TYPE_SOCIAL_LOGIN;

export interface OnboardingCompletedAnalyticsProps {
  implementation_type: typeof ONBOARDING_IMPLEMENTATION_TYPE_NATIVE;
  onboarding_type: OnboardingType;
}

export function getOnboardingCompletedAnalyticsProps(
  isSocialLogin: boolean,
): OnboardingCompletedAnalyticsProps {
  return {
    implementation_type: ONBOARDING_IMPLEMENTATION_TYPE_NATIVE,
    onboarding_type: isSocialLogin
      ? ONBOARDING_TYPE_SOCIAL_LOGIN
      : ONBOARDING_TYPE_SEED_PHRASE,
  };
}
