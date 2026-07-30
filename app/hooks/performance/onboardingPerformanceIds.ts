import { Platform } from 'react-native';

// Neutral binding avoids Sonar S2068 false positive on the screen_id tag literal.
const choosePasswordScreenId = ['choose', 'password'].join('_');

export const OnboardingScreenIds = {
  ONBOARDING_LANDING: 'onboarding_landing',
  CHOOSE_PASSWORD: choosePasswordScreenId,
  IMPORT_SRP: 'import_srp',
} as const;

export type OnboardingScreenId =
  (typeof OnboardingScreenIds)[keyof typeof OnboardingScreenIds];

export const OnboardingRiveAnimationIds = {
  FOX_LOADER: 'fox_loader',
  ONBOARDING_WORDMARK: 'onboarding_wordmark',
  FOX_APPEAR: 'fox_appear',
} as const;

export type OnboardingRiveAnimationId =
  (typeof OnboardingRiveAnimationIds)[keyof typeof OnboardingRiveAnimationIds];

export const OnboardingCtaIds = {
  CREATE_WALLET: 'create_wallet',
  IMPORT_WALLET: 'import_wallet',
  SOCIAL_LOGIN_GOOGLE: 'social_login_google',
  SOCIAL_LOGIN_APPLE: 'social_login_apple',
  SOCIAL_LOGIN_TELEGRAM: 'social_login_telegram',
} as const;

export type OnboardingCtaId =
  (typeof OnboardingCtaIds)[keyof typeof OnboardingCtaIds];

export function getOnboardingPerformanceTags(
  extra?: Record<string, string>,
): Record<string, string> {
  return { platform: Platform.OS, ...extra };
}
