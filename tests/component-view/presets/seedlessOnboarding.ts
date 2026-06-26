import { createStateFixture } from '../stateFixture';

/**
 * Baseline Redux state for seedless onboarding component view tests.
 * Screens are route-param driven; no unlocked wallet is required.
 */
export const initialStateSeedlessOnboarding = () =>
  createStateFixture()
    .withRemoteFeatureFlags({})
    .withMinimalAnalyticsController();
