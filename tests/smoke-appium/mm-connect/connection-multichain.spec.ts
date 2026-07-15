import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeMMConnect } from '../../tags.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import AndroidScreenHelpers from '../../page-objects/MMConnect/AndroidScreenHelpers.js';
import DappConnectionModal from '../../page-objects/MMConnect/DappConnectionModal.js';
import PlaywrightContextHelpers from '../../framework/PlaywrightContextHelpers.js';
import ChromeCdpHelpers from '../../framework/ChromeCdpHelpers.js';
import {
  DappServer,
  DappVariants,
  TestDapps,
} from '../../framework/index.js';
import {
  getDappUrlForBrowser,
  setupAdbReverse,
  cleanupAdbReverse,
  waitForDappServerReady,
  unlockIfLockScreenVisible,
} from './utils.js';
import {
  launchMobileBrowser,
  navigateToDapp,
  switchToMobileBrowser,
} from '../../flows/native-browser.flow.js';
import { multichainBrowserFixture } from './mm-connect-fixtures.js';
import { MMConnectDappTestIds } from '../../selectors/MMConnect/MMConnectDapp.testIds.js';

const DAPP_PORT = 8090;

const playgroundServer = new DappServer({
  dappCounter: 0,
  rootDirectory: TestDapps[DappVariants.BROWSER_PLAYGROUND].dappPath,
  dappVariant: DappVariants.BROWSER_PLAYGROUND,
});

const scopeCardTestId = (scope: string): string =>
  `${MMConnectDappTestIds.SCOPE_CARD}-${scope.toLowerCase().replace(/:/g, '-')}`;

appiumTest.describe(SmokeMMConnect('Multichain browser connect'), () => {
  appiumTest.beforeAll(async () => {
    playgroundServer.setServerPort(DAPP_PORT);
    await playgroundServer.start();
    await waitForDappServerReady(DAPP_PORT);
    setupAdbReverse(DAPP_PORT);
  });

  appiumTest.afterAll(async () => {
    cleanupAdbReverse(DAPP_PORT);
    await playgroundServer.stop();
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
          const DAPP_URL = getDappUrlForBrowser(currentDeviceDetails.platform);

          await PlaywrightContextHelpers.withNativeAction(async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });
            await launchMobileBrowser({ safelyOnboardChrome: true });
            await navigateToDapp(DAPP_URL);
          });

          // Emulator Chrome 113: Appium WEBVIEW_chrome switch hangs in Chromedriver
          // session creation. Drive the dapp via CDP instead.
          await ChromeCdpHelpers.waitAndClickTestId(
            DAPP_URL,
            MMConnectDappTestIds.CONNECT_BUTTON,
          );

          await PlaywrightContextHelpers.withNativeAction(async () => {
            await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
            await unlockIfLockScreenVisible();
            await DappConnectionModal.tapConnectButton();
          });

          await switchToMobileBrowser();

          await ChromeCdpHelpers.waitForTestId(
            DAPP_URL,
            MMConnectDappTestIds.SCOPES_SECTION,
          );
          await ChromeCdpHelpers.waitForTestId(
            DAPP_URL,
            scopeCardTestId('eip155:1'),
          );
          await ChromeCdpHelpers.waitAndClickTestId(
            DAPP_URL,
            MMConnectDappTestIds.DISCONNECT_BUTTON,
          );
        },
      );
    },
  );
});
