/* eslint-env jest */
import Utilities from './framework/Utilities';
import { warmupProxyCa } from './framework/services/proxy-setup';

/**
 * Before all tests, modify the app launch arguments to include the blacklistURLs.
 * This sets up the environment for Detox tests.
 */
beforeAll(async () => {
  device.appLaunchArgs.modify({
    detoxURLBlacklistRegex: Utilities.BlacklistURLs,
    permissions: { notifications: 'YES' },
  });

  // Warm up the device-proxy CA so Mockttp's HTTPS options and the per-test
  // proxy setup in withFixtures find it ready. Best-effort and idempotent —
  // failures surface later from the per-test path only if actually needed.
  await warmupProxyCa();
});
