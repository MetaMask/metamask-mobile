/* eslint-env jest */
import Utilities from './framework/Utilities';
import { warmupProxyCa } from './framework/services/proxy-setup';
import { stopSharedMockServer } from './framework/fixtures/FixtureHelper';

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

/**
 * The mock server is shared across the tests of a spec file (it must outlive
 * individual tests so the device-proxied Detox WebSocket tunnel survives test
 * boundaries — see createMockAPIServer). Stop it once the file is done so the
 * port is released and Jest can exit cleanly.
 */
afterAll(async () => {
  await stopSharedMockServer();
});
