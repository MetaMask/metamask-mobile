import type { TraceContext } from '../../../util/trace';

/**
 * Route params for `OnboardingOAuthRehydrate` (nested in onboarding navigator).
 * @see Routes.ONBOARDING.ONBOARDING_OAUTH_REHYDRATE
 */
export interface OnboardingOAuthRehydrateParams {
  previous_screen?: string;
  oauthLoginSuccess?: boolean;
  onboardingTraceCtx?: TraceContext;
}

/**
 * Route params for `Rehydrate` (OAuth unlock / seedless rehydration).
 * Used in both app and onboarding stacks.
 */
export interface RehydrateParams extends OnboardingOAuthRehydrateParams {
  isSeedlessPasswordOutdated?: boolean;
  locked?: boolean;
}

/** Params received by the `OAuthRehydration` screen component. */
export type OAuthRehydrationRouteParams = RehydrateParams;
