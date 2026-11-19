import { createStateFixture } from '../stateFixture';

/** Provider-free state for the Collectibles module entry points. */
export const initialStateCollectibles = () =>
  createStateFixture()
    .withMinimalAnalyticsController()
    .withRemoteFeatureFlags({
      collectiblesEnabled: { enabled: true, minimumVersion: '0.0.1' },
    });
