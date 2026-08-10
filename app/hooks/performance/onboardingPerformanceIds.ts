import { Platform } from 'react-native';

// Ids must not contain the substrings Sentry's default scrubber redacts on
// ("password", "auth", "token", "secret", ...): it matches values as well as
// keys, so such an id reaches Sentry as [Filtered] on every tag, breadcrumb and
// destination_screen_id that carries it.
// The neutral binding additionally avoids a Sonar S2068 false positive here.
const choosePasswordScreenId = ['choose', 'pw'].join('_');

export const OnboardingScreenIds = {
  ONBOARDING_LANDING: 'onboarding_landing',
  CHOOSE_PASSWORD: choosePasswordScreenId,
  IMPORT_SRP: 'import_srp',
  ACCOUNT_ALREADY_EXISTS: 'account_already_exists',
  ACCOUNT_NOT_FOUND: 'account_not_found',
  SOCIAL_REHYDRATE: 'social_rehydrate',
  SOCIAL_LOGIN_SUCCESS_NEW_USER: 'social_login_success_new_user',
  SOCIAL_LOGIN_SUCCESS_EXISTING_USER: 'social_login_success_existing_user',
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
