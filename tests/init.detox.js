/* eslint-env jest */
import Utilities from './framework/Utilities';
import { ensureE2ECa, DEFAULT_CA_CACHE_DIR } from './api-mocking/certs.ts';
import { setupAndroidProxy } from './framework/fixtures/AndroidProxySetup.ts';
import { FALLBACK_MOCKSERVER_PORT } from './framework/Constants.ts';

// Worker-scoped flag: setupAndroidProxy runs once per Jest worker, not once per
// spec file. The emulator state persists between specs, so re-running adb push
// + mv each time would fail on the already-installed cert.
let osLevelProxyConfigured = false;

/**
 * Before all tests, modify the app launch arguments to include the blacklistURLs.
 * This sets up the environment for Detox tests.
 */
beforeAll(async () => {
  device.appLaunchArgs.modify({
    detoxURLBlacklistRegex: Utilities.BlacklistURLs,
    permissions: { notifications: 'YES' },
  });

  // OS-level proxy wiring (Android only, opt-in via env var). Installs the
  // mockttp CA into the emulator's user trust store and points `http_proxy`
  // at localhost:8000, which adb reverse already maps to the host's dynamic
  // mockttp port. Native HTTP clients (OkHttp, react-native-blob-util, etc.)
  // then become visible to mockttp without any JS-layer shim.
  //
  // Gated behind MMQA_OS_PROXY=true because a previous wiring attempt caused
  // a Detox runtime regression (see PR #30012 / MMQA-1805 history). Keep this
  // disabled by default until the regression is understood; flip the flag on
  // a per-job basis when iterating.
  if (
    process.env.MMQA_OS_PROXY === 'true' &&
    !osLevelProxyConfigured &&
    device.getPlatform() === 'android'
  ) {
    const { certPath } = await ensureE2ECa(DEFAULT_CA_CACHE_DIR);
    await setupAndroidProxy({
      udid: device.id,
      caCertPath: certPath,
      proxyHost: 'localhost',
      proxyPort: FALLBACK_MOCKSERVER_PORT,
    });
    osLevelProxyConfigured = true;
  }
});
