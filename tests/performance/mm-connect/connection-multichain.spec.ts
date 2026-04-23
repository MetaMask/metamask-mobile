import { test } from '../../framework/fixture';
import TimerHelper from '../../framework/TimerHelper';
import { loginToAppPlaywright } from '../../flows/wallet.flow';
import BrowserPlaygroundDapp from '../../page-objects/MMConnect/BrowserPlaygroundDapp';
import AndroidScreenHelpers from '../../page-objects/MMConnect/AndroidScreenHelpers';
import DappConnectionModal from '../../page-objects/MMConnect/DappConnectionModal';
import PlaywrightContextHelpers from '../../framework/PlaywrightContextHelpers';
import {
  DappServer,
  DappVariants,
  PlaywrightGestures,
  TestDapps,
  asPlaywrightElement,
  sleep,
} from '../../framework';
import {
  getDappUrlForBrowser,
  setupAdbReverse,
  cleanupAdbReverse,
  waitForDappServerReady,
  unlockIfLockScreenVisible,
} from './utils';
import {
  launchMobileBrowser,
  navigateToDapp,
  switchToMobileBrowser,
} from '../../flows/native-browser.flow';

const DAPP_PORT = 8090;

// Create the playground server using the shared framework
const playgroundServer = new DappServer({
  dappCounter: 0,
  rootDirectory: TestDapps[DappVariants.BROWSER_PLAYGROUND].dappPath,
  dappVariant: DappVariants.BROWSER_PLAYGROUND,
});

// Start local playground server before all tests
test.beforeAll(async () => {
  playgroundServer.setServerPort(DAPP_PORT);
  await playgroundServer.start();
  await waitForDappServerReady(DAPP_PORT);
  setupAdbReverse(DAPP_PORT);
});

// Stop local playground server after all tests
test.afterAll(async () => {
  cleanupAdbReverse(DAPP_PORT);
  await playgroundServer.stop();
});

test('@metamask/connect-multichain - Connect via Multichain API to Local Browser Playground', async ({
  currentDeviceDetails,
  driver,
}) => {
  const useBrowserStackLocal =
    process.env.BROWSERSTACK_LOCAL?.toLowerCase() === 'true';
  const DAPP_URL = useBrowserStackLocal
    ? `http://bs-local.com:${DAPP_PORT}`
    : getDappUrlForBrowser(currentDeviceDetails.platform);

  //
  // Login and navigate to dapp
  //

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await loginToAppPlaywright();
    await launchMobileBrowser();
    await navigateToDapp(DAPP_URL);
  });

  //
  // Connect via Multichain API
  //
  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.waitForConnectButtonVisible(15000);
    await BrowserPlaygroundDapp.tapConnect();
  }, DAPP_URL);

  // Handle connection approval in MetaMask
  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await unlockIfLockScreenVisible();
    await DappConnectionModal.tapConnectButton();
  });

  // Switch back to browser
  await switchToMobileBrowser();
  await sleep(500);

  //
  // Verify connection
  //

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertMultichainConnected(true);
    await PlaywrightGestures.scrollIntoView(
      await asPlaywrightElement(BrowserPlaygroundDapp.getScopeCard('eip155:1')),
    );
    await BrowserPlaygroundDapp.assertScopeCardVisible('eip155:1');
  }, DAPP_URL);

  //
  // Cleanup - disconnect
  //

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.tapDisconnect();
  }, DAPP_URL);
});
