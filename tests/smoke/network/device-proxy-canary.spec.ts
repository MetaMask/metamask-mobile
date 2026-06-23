import { SmokeNetworkAbstractions } from '../../tags';
import { loginToApp } from '../../flows/wallet.flow';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import Utilities from '../../framework/Utilities';
import type { InternalMockServer } from '../../api-mocking/MockServerE2E';

// The device-level proxy is active on Detox Android but dormant on Detox iOS
// in Phase 0 (the Detox launch path never passes e2eIosProxyPort), so a
// "proxy is intercepting" assertion can only hold on Android. Mirrors the
// platform-gating pattern used elsewhere in the smoke suite.
const describeOrSkip =
  device.getPlatform() === 'android' ? describe : describe.skip;

describeOrSkip(SmokeNetworkAbstractions('Device proxy canary'), (): void => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  /**
   * Guards against the device proxy silently regressing to dormant — a state
   * that would otherwise pass every functional spec (traffic just goes live)
   * while quietly defeating the entire point of device-level mocking. Booting
   * and unlocking the app generates substantial native traffic; if the OS
   * proxy is on the path, MockServerE2E observes those arrivals and increments
   * its device-proxy request count. A count of 0 means nothing was intercepted
   * — i.e. the proxy is not engaged — and fails the canary.
   */
  it('routes native app traffic through the host mock server', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async ({ mockServer }) => {
        await loginToApp();

        const server = mockServer as InternalMockServer;
        await Utilities.waitUntil(
          async () => (server._deviceProxyRequestCount ?? 0) > 0,
          { interval: 1000, timeout: 60000 },
        );
      },
    );
  });
});
