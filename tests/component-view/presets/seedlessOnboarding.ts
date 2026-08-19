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
