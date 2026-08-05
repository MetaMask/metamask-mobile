import { test as appiumTest } from '../../../framework/fixtures/playwright/index.js';
import { SmokeNetworkExpansion } from '../../../tags.js';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper.js';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder.js';
import {
  DappServer,
  DappVariants,
  TestDapps,
} from '../../../framework/index.js';
import {
  setupAdbReverse,
  cleanupAdbReverse,
  waitForDappServerReady,
} from '../../mm-connect/utils.js';
import BitcoinTestDapp, {
  BITCOIN_DAPP_PORT,
} from '../../../page-objects/Browser/BitcoinTestDapp.js';
import ToastModal from '../../../page-objects/wallet/ToastModal.js';

// Truncated Bitcoin account address shown in the dapp header after connect
const account1Short = 'bc1q...yump';

// Expected deterministic BIP-340 Schnorr signature for the fixed test message
const signedMessageStandard =
  '271486823211510961053671593213121630193816218985222159577512714825421410039180175314517251232893341221418210218699217951999213157247101787166209162102702122391448617217326133312849199212551951866224105551902392399522115638752383224419341608718511954214130102';

const bitcoinDappServer = new DappServer({
  dappCounter: 0,
  rootDirectory: TestDapps[DappVariants.BITCOIN_TEST_DAPP].dappPath,
  dappVariant: DappVariants.BITCOIN_TEST_DAPP,
});

appiumTest.describe(SmokeNetworkExpansion('Bitcoin Wallet Standard'), () => {
  appiumTest.describe.configure({ timeout: 300_000 });

  appiumTest.beforeAll(async () => {
    bitcoinDappServer.setServerPort(BITCOIN_DAPP_PORT);
    await bitcoinDappServer.start();
    await waitForDappServerReady(BITCOIN_DAPP_PORT);
    setupAdbReverse(BITCOIN_DAPP_PORT);
  });

  appiumTest.afterAll(async () => {
    cleanupAdbReverse(BITCOIN_DAPP_PORT);
    await bitcoinDappServer.stop();
  });

  appiumTest(
    'Connects and disconnects from Bitcoin test dapp',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          await BitcoinTestDapp.setupAndNavigate();
          await BitcoinTestDapp.connect();

          await BitcoinTestDapp.verifyAccount(account1Short);
          await BitcoinTestDapp.verifyConnectionStatus('Connected');

          await BitcoinTestDapp.disconnect();

          await BitcoinTestDapp.verifyConnectionStatus('Not connected');
        },
      );
    },
  );

  // Locally the test passes always and the app shows connected within 1 sec.
  // On CI it passes fine on iOS. But on Android it still sometimes fails the
  // first attempt with: timed out after 30s, status still "Not connected".
  appiumTest.skip(
    'Stays connected after page refresh',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          await BitcoinTestDapp.setupAndNavigate();
          await BitcoinTestDapp.connect();
          await ToastModal.waitForToastToDismiss();

          await BitcoinTestDapp.verifyAccount(account1Short);
          await BitcoinTestDapp.verifyConnectionStatus('Connected');

          await BitcoinTestDapp.reload();

          await BitcoinTestDapp.verifyAccount(account1Short);
          await BitcoinTestDapp.verifyConnectionStatus('Connected');
        },
      );
    },
  );

  appiumTest(
    'Signs a message',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          await BitcoinTestDapp.setupAndNavigate();
          await BitcoinTestDapp.connect();

          await BitcoinTestDapp.signMessage();
          await BitcoinTestDapp.confirmSignMessage();

          await BitcoinTestDapp.verifySignedMessage(signedMessageStandard);
        },
      );
    },
  );
});
