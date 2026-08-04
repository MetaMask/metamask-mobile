import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeMMConnect } from '../../tags.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import ChromeCdpHelpers from '../../framework/ChromeCdpHelpers.js';
import { refreshMobileBrowser } from '../../flows/native-browser.flow.js';
import PlaywrightContextHelpers from '../../framework/PlaywrightContextHelpers.js';
import { getDappUrlForBrowser } from './utils.js';
import { multichainBrowserFixture } from './mm-connect-fixtures.js';
import { MMConnectDappTestIds } from '../../selectors/MMConnect/MMConnectDapp.testIds.js';
import {
  DEFAULT_MM_CONNECT_DAPP_PORT,
  MM_CONNECT_ACCOUNT_1,
  MM_CONNECT_ACCOUNT_3,
  MM_CONNECT_ACCOUNT_3_NAME,
  MM_CONNECT_LEGACY_CHAIN_ID,
  assertLegacyEvmConnected,
  connectLegacyDappViaMetaMask,
  createBrowserPlaygroundServer,
  loginCreateAccountsAndOpenDapp,
  rejectLegacyPersonalSign,
  returnToDappAndWaitFor,
  startBrowserPlaygroundServer,
  stopBrowserPlaygroundServer,
  switchWalletAccount,
} from '../../flows/mm-connect.flow.js';

const playgroundServer = createBrowserPlaygroundServer(
  DEFAULT_MM_CONNECT_DAPP_PORT,
);

appiumTest.describe(SmokeMMConnect('EVM account switching'), () => {
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
    '@metamask/connect-evm - Account switching and wallet-side verification',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: multichainBrowserFixture(),
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          const dappUrl = getDappUrlForBrowser(currentDeviceDetails.platform);

          // Account 1 exists in the fixture; create Account 2 + Account 3.
          await loginCreateAccountsAndOpenDapp(dappUrl, 2);
          await connectLegacyDappViaMetaMask(dappUrl, {
            additionalAccounts: [MM_CONNECT_ACCOUNT_3_NAME],
          });
          await returnToDappAndWaitFor(
            dappUrl,
            MMConnectDappTestIds.LEGACY_EVM_ACTIVE_ACCOUNT,
          );
          await assertLegacyEvmConnected(dappUrl, {
            chainId: MM_CONNECT_LEGACY_CHAIN_ID,
            activeAccount: MM_CONNECT_ACCOUNT_1,
          });

          await switchWalletAccount(
            MM_CONNECT_ACCOUNT_3_NAME,
            currentDeviceDetails,
          );
          await returnToDappAndWaitFor(
            dappUrl,
            MMConnectDappTestIds.LEGACY_EVM_ACTIVE_ACCOUNT,
          );
          await assertLegacyEvmConnected(dappUrl, {
            chainId: MM_CONNECT_LEGACY_CHAIN_ID,
            activeAccount: MM_CONNECT_ACCOUNT_3,
          });

          await PlaywrightContextHelpers.withNativeAction(async () => {
            await refreshMobileBrowser();
          });
          await assertLegacyEvmConnected(dappUrl, {
            chainId: MM_CONNECT_LEGACY_CHAIN_ID,
            activeAccount: MM_CONNECT_ACCOUNT_3,
          });

          // Cancel personal_sign — verifies Account 3 is the wallet-side signer.
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
