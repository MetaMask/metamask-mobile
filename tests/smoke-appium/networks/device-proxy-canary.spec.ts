import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeNetworkAbstractions } from '../../tags.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import Utilities from '../../framework/Utilities.js';
import { PlatformDetector } from '../../framework/PlatformLocator.js';
import type { InternalMockServer } from '../../api-mocking/MockServerE2E.js';

/**
 * Guards against the device proxy silently regressing to dormant — a state
 * that would otherwise pass every functional spec (traffic just goes live)
 * while quietly defeating device-level mocking. Booting and unlocking the app
 * generates substantial native traffic; if the OS proxy is on the path,
 * MockServerE2E observes those arrivals and increments its device-proxy
 * request count. A count of 0 means nothing was intercepted.
 *
 * Android-only in Phase 0: iOS coverage is RN NSURLSession + SocketRocket
 * (not full process/OS proxy), so this canary would be a weaker signal there.
 */
appiumTest.describe(SmokeNetworkAbstractions('Device proxy canary'), () => {
  appiumTest(
    'routes native app traffic through the host mock server',
    async ({ driver: _driver, currentDeviceDetails }) => {
      appiumTest.skip(
        PlatformDetector.isIOS(),
        'Phase 0: device-proxy canary is Android-only (full OS-level proxy)',
      );

      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
          currentDeviceDetails,
        },
        async ({ mockServer }) => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });

          const server = mockServer as InternalMockServer;
          await Utilities.waitUntil(
            async () => (server._deviceProxyRequestCount ?? 0) > 0,
            { interval: 1000, timeout: 60000 },
          );
        },
      );
    },
  );
});
