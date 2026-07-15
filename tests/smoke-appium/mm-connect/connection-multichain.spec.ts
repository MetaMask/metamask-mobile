import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeMMConnect } from '../../tags.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import BrowserPlaygroundDapp from '../../page-objects/MMConnect/BrowserPlaygroundDapp.js';
import AndroidScreenHelpers from '../../page-objects/MMConnect/AndroidScreenHelpers.js';
import DappConnectionModal from '../../page-objects/MMConnect/DappConnectionModal.js';
import PlaywrightContextHelpers from '../../framework/PlaywrightContextHelpers.js';
import {
  DappServer,
  DappVariants,
  PlaywrightGestures,
  TestDapps,
  asPlaywrightElement,
  sleep,
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

const DAPP_PORT = 8090;

const playgroundServer = new DappServer({
  dappCounter: 0,
  rootDirectory: TestDapps[DappVariants.BROWSER_PLAYGROUND].dappPath,
  dappVariant: DappVariants.BROWSER_PLAYGROUND,
});

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

          await PlaywrightContextHelpers.withWebAction(async () => {
            await BrowserPlaygroundDapp.waitForConnectButtonVisible(15000);
            await BrowserPlaygroundDapp.tapConnect();
          }, DAPP_URL);

          await PlaywrightContextHelpers.withNativeAction(async () => {
            await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
            await unlockIfLockScreenVisible();
            await DappConnectionModal.tapConnectButton();
          });

          await switchToMobileBrowser();
          await sleep(500);

          await PlaywrightContextHelpers.withWebAction(async () => {
            await BrowserPlaygroundDapp.assertMultichainConnected(true);
            await PlaywrightGestures.scrollIntoView(
              await asPlaywrightElement(
                BrowserPlaygroundDapp.getScopeCard('eip155:1'),
              ),
            );
            await BrowserPlaygroundDapp.assertScopeCardVisible('eip155:1');
          }, DAPP_URL);

          await PlaywrightContextHelpers.withWebAction(async () => {
            await BrowserPlaygroundDapp.tapDisconnect();
          }, DAPP_URL);
        },
      );
    },
  );
});
