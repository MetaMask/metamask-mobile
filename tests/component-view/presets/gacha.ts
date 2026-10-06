import { createStateFixture } from '../stateFixture';

/** Provider-free state for the Gacha module entry points. */
export const initialStateGacha = () =>
  createStateFixture()
    .withMinimalAnalyticsController()
    .withRemoteFeatureFlags({
      gachaEnabled: { enabled: true, minimumVersion: '0.0.1' },
    });
