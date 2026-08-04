import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeMMConnect } from '../../tags.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import ChromeCdpHelpers from '../../framework/ChromeCdpHelpers.js';
import { getDappUrlForBrowser } from './utils.js';
import { multichainBrowserFixture } from './mm-connect-fixtures.js';
import { MMConnectDappTestIds } from '../../selectors/MMConnect/MMConnectDapp.testIds.js';
import {
  DEFAULT_MM_CONNECT_DAPP_PORT,
  MM_CONNECT_ACCOUNT_1,
  MM_CONNECT_LEGACY_CHAIN_ID,
  assertLegacyEvmConnected,
  assertLegacyEvmDisconnected,
  connectLegacyDappViaMetaMask,
  createBrowserPlaygroundServer,
  loginLaunchAndOpenDapp,
  rejectLegacyPersonalSign,
  returnToDappAndWaitFor,
  startBrowserPlaygroundServer,
  stopBrowserPlaygroundServer,
} from '../../flows/mm-connect.flow.js';

const playgroundServer = createBrowserPlaygroundServer(
  DEFAULT_MM_CONNECT_DAPP_PORT,
);

appiumTest.describe(SmokeMMConnect('EVM rejection'), () => {
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
    '@metamask/connect-evm - Rejection response value verification',
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
          await connectLegacyDappViaMetaMask(dappUrl);
          await returnToDappAndWaitFor(
            dappUrl,
            MMConnectDappTestIds.LEGACY_EVM_ACTIVE_ACCOUNT,
          );
          await assertLegacyEvmConnected(dappUrl, {
            chainId: MM_CONNECT_LEGACY_CHAIN_ID,
            activeAccount: MM_CONNECT_ACCOUNT_1,
          });
          await rejectLegacyPersonalSign(dappUrl, currentDeviceDetails);

          // Disconnect → reconnect → reject (first cycle)
          await ChromeCdpHelpers.waitAndClickTestId(
            dappUrl,
            MMConnectDappTestIds.DISCONNECT_BUTTON,
          );
          await assertLegacyEvmDisconnected(dappUrl);
          await connectLegacyDappViaMetaMask(dappUrl);
          await returnToDappAndWaitFor(
            dappUrl,
            MMConnectDappTestIds.LEGACY_EVM_ACTIVE_ACCOUNT,
          );
          await assertLegacyEvmConnected(dappUrl, {
            chainId: MM_CONNECT_LEGACY_CHAIN_ID,
            activeAccount: MM_CONNECT_ACCOUNT_1,
          });
          await rejectLegacyPersonalSign(dappUrl, currentDeviceDetails);

          // Disconnect → reconnect → reject (second cycle)
          await ChromeCdpHelpers.waitAndClickTestId(
            dappUrl,
            MMConnectDappTestIds.DISCONNECT_BUTTON,
          );
          await connectLegacyDappViaMetaMask(dappUrl);
          await returnToDappAndWaitFor(
            dappUrl,
            MMConnectDappTestIds.LEGACY_EVM_ACTIVE_ACCOUNT,
          );
          await assertLegacyEvmConnected(dappUrl, {
            chainId: MM_CONNECT_LEGACY_CHAIN_ID,
            activeAccount: MM_CONNECT_ACCOUNT_1,
          });
          await rejectLegacyPersonalSign(dappUrl, currentDeviceDetails);

          await ChromeCdpHelpers.waitAndClickTestId(
            dappUrl,
            MMConnectDappTestIds.DISCONNECT_BUTTON,
          );
        },
      );
    },
  );
});
