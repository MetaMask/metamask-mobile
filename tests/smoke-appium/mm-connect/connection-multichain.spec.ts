import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeMMConnect } from '../../tags.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import ChromeCdpHelpers from '../../framework/ChromeCdpHelpers.js';
import { getDappUrlForBrowser } from './utils.js';
import { multichainBrowserFixture } from './mm-connect-fixtures.js';
import { MMConnectDappTestIds } from '../../selectors/MMConnect/MMConnectDapp.testIds.js';
import {
  DEFAULT_MM_CONNECT_DAPP_PORT,
  connectDappViaMetaMask,
  createBrowserPlaygroundServer,
  ensureMainnetScopeCheckboxes,
  loginLaunchAndOpenDapp,
  returnToDappAndWaitFor,
  scopeCardTestId,
  startBrowserPlaygroundServer,
  stopBrowserPlaygroundServer,
} from '../../flows/mm-connect.flow.js';

const playgroundServer = createBrowserPlaygroundServer(
  DEFAULT_MM_CONNECT_DAPP_PORT,
);

appiumTest.describe(SmokeMMConnect('Multichain browser connect'), () => {
  appiumTest.beforeAll(async () => {
    await startBrowserPlaygroundServer(
      playgroundServer,
      DEFAULT_MM_CONNECT_DAPP_PORT,
    );
  });

  appiumTest.afterAll(async () => {
    await stopBrowserPlaygroundServer(
      playgroundServer,
      DEFAULT_MM_CONNECT_DAPP_PORT,
    );
  });

  appiumTest(
    '@metamask/connect-multichain - Connect via Multichain API to Local Browser Playground',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: multichainBrowserFixture(),
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          const dappUrl = getDappUrlForBrowser(currentDeviceDetails.platform);

          await loginLaunchAndOpenDapp(dappUrl);
          await ensureMainnetScopeCheckboxes(dappUrl);
          await connectDappViaMetaMask(dappUrl);
          await returnToDappAndWaitFor(
            dappUrl,
            MMConnectDappTestIds.SCOPES_SECTION,
          );
          await ChromeCdpHelpers.waitForTestId(
            dappUrl,
            scopeCardTestId('eip155:1'),
          );
          await ChromeCdpHelpers.waitAndClickTestId(
            dappUrl,
            MMConnectDappTestIds.DISCONNECT_BUTTON,
          );
        },
      );
    },
  );
});
