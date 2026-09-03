export const ONBOARDING_LOADING_STALL_MS = 30_000;

export const ONBOARDING_LOADING_STALL_SCREEN = {
  ONBOARDING: 'onboarding',
  CREATE_PASSWORD: 'create_password',
  IMPORT_SRP: 'import_srp',
  LOGIN: 'login',
  REHYDRATION: 'rehydration',
} as const;

export type OnboardingLoadingStallScreen =
  (typeof ONBOARDING_LOADING_STALL_SCREEN)[keyof typeof ONBOARDING_LOADING_STALL_SCREEN];
