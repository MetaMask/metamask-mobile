import { initialStateWallet } from './wallet';

/** Provider-free state for the Collectibles module entry points. */
export const initialStateCollectibles = () =>
  initialStateWallet().withRemoteFeatureFlags({
    collectiblesEnabled: { enabled: true, minimumVersion: '0.0.1' },
  });
