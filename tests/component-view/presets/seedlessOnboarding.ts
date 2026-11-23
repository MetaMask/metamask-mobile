import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { createStateFixture } from '../stateFixture';

/** Access token for auth-server marketing opt-in API calls in CV tests. */
export const SEEDLESS_CV_ACCESS_TOKEN = 'cv-seedless-access-token';

/**
 * Engine + Redux overrides for seedless social-login flows (marketing sync, geolocation).
 */
export const seedlessSocialLoginStateOverrides: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      GeolocationController: {
        location: 'US',
      },
      SeedlessOnboardingController: {
        accessToken: SEEDLESS_CV_ACCESS_TOKEN,
      },
    },
  },
} as DeepPartial<RootState>;

/**
 * Baseline Redux state for seedless onboarding component view tests.
 * Screens are route-param driven; no unlocked wallet is required.
 */
export const initialStateSeedlessOnboarding = () =>
  createStateFixture()
    .withRemoteFeatureFlags({})
    .withMinimalAnalyticsController()
    .withOverrides(seedlessSocialLoginStateOverrides);

/**
 * Baseline Redux state for the Security & privacy marketing-consent section
 * (MetaMetricsAndDataCollectionSection) rendered for a social-login user.
 *
 * Mirrors the desync setup from GE-644 / GE-647: the user has marketing
 * consent enabled locally while the auth server still holds its own
 * `is_opt_in` value, and every toggle POSTs the new choice to the auth
 * server (see tests/component-view/api-mocking/seedless-onboarding.ts).
 */
export const initialStateSeedlessSecuritySettings = (
  options: {
    /** Local marketing preference (state.security.dataCollectionForMarketing). */
    dataCollectionForMarketing?: boolean;
    /** AnalyticsController.optedIn — gates marketing consent traits. */
    analyticsOptedIn?: boolean;
  } = {},
) =>
  initialStateSeedlessOnboarding()
    .withMinimalKeyringController()
    .withMinimalAnalyticsController({
      optedIn: options.analyticsOptedIn ?? true,
    })
    .withOverrides({
      security: {
        allowLoginWithRememberMe: false,
        dataCollectionForMarketing: options.dataCollectionForMarketing ?? true,
        isNFTAutoDetectionModalViewed: false,
        osAuthEnabled: true,
        shouldShowConsentSheet: true,
        dataSharingPreference: null,
      },
      engine: {
        backgroundState: {
          // A vault marks the seedless login flow
          // (selectSeedlessOnboardingLoginFlow), which is what routes every
          // consent write to OAuthService.updateMarketingOptInStatus.
          SeedlessOnboardingController: {
            vault: 'seedless-cv-vault',
          },
        },
      },
    } as DeepPartial<RootState>);
