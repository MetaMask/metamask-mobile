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
 * The local choice is the only source of truth: nothing is read from or
 * written to the auth server. The seedless login flow marker is still set
 * because it gates how the section resolves consent signals.
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
          // (selectSeedlessOnboardingLoginFlow).
          SeedlessOnboardingController: {
            vault: 'seedless-cv-vault',
          },
          AnalyticsController: {
            optedInToMarketing: options.dataCollectionForMarketing ?? true,
            marketingConsentDecisionMade: true,
          },
        },
      },
    } as DeepPartial<RootState>);
