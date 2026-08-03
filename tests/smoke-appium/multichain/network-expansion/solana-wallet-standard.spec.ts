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
import SolanaTestDApp, {
  SOLANA_DAPP_PORT,
} from '../../../page-objects/Browser/SolanaTestDAppAppium.js';
import TabBarComponent from '../../../page-objects/wallet/TabBarComponent.js';
import PlaywrightMatchers from '../../../framework/PlaywrightMatchers.js';
import PlaywrightGestures from '../../../framework/PlaywrightGestures.js';
import { navigateToBrowserView } from '../../../flows/browser.flow.js';

// Truncated Solana account addresses shown in the dapp header
const account1Short = 'CEQ8...Yrrd';
const account2Short = '9Wa2...Dj2U';

const solanaDappServer = new DappServer({
  dappCounter: 0,
  rootDirectory: TestDapps[DappVariants.SOLANA_TEST_DAPP].dappPath,
  dappVariant: DappVariants.SOLANA_TEST_DAPP,
});

appiumTest.describe(SmokeNetworkExpansion('Solana Wallet Standard'), () => {
  appiumTest.describe.configure({ timeout: 300_000 });

  appiumTest.beforeAll(async () => {
    solanaDappServer.setServerPort(SOLANA_DAPP_PORT);
    await solanaDappServer.start();
    await waitForDappServerReady(SOLANA_DAPP_PORT);
    setupAdbReverse(SOLANA_DAPP_PORT);
  });

  appiumTest.afterAll(async () => {
    cleanupAdbReverse(SOLANA_DAPP_PORT);
    await solanaDappServer.stop();
  });

  appiumTest(
    'should connect and disconnect from Solana test dapp',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          await SolanaTestDApp.setupAndNavigate();
          await SolanaTestDApp.connect();

          await SolanaTestDApp.verifyAccount(account1Short);
          await SolanaTestDApp.verifyConnectionStatus('Connected');

          await SolanaTestDApp.disconnect();

          await SolanaTestDApp.verifyConnectionStatus('Not connected');
        },
      );
    },
  );

  appiumTest(
    'should cancel connection and reconnect',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          await SolanaTestDApp.setupAndNavigate();

          // Start the connect flow but cancel in MetaMask's modal
          await SolanaTestDApp.clickConnectButton();
          await SolanaTestDApp.selectMetaMaskWallet();
          await SolanaTestDApp.tapCancel();

          await SolanaTestDApp.verifyConnectionStatus('Not connected');

          // Full connect should now succeed
          await SolanaTestDApp.connect();
          await SolanaTestDApp.verifyAccount(account1Short);
        },
      );
    },
  );

  appiumTest(
    'should stay connected after page refresh',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          await SolanaTestDApp.setupAndNavigate();
          await SolanaTestDApp.connect();

          await SolanaTestDApp.verifyAccount(account1Short);

          await SolanaTestDApp.reload();

          await SolanaTestDApp.verifyAccount(account1Short);
          await SolanaTestDApp.verifyConnectionStatus('Connected');
        },
      );
    },
  );

  appiumTest(
    'should trigger sign transaction confirmation and cancel (MMQA-586)',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          await SolanaTestDApp.setupAndNavigate();
          await SolanaTestDApp.connect();

          await SolanaTestDApp.signTransaction();

          // Verify the Snap confirmation appeared and cancel it.
          // Sending the actual transaction is blocked until devnet is
          // supported on mobile (https://github.com/MetaMask/metamask-mobile/issues/15002).
          await SolanaTestDApp.tapCancelTransaction();
        },
      );
    },
  );

  // Skipped: the default Appium fixture only has one Solana snap account in
  // internalAccounts. A second Solana account (account2Short) needs to be added
  // to both AccountsController.internalAccounts and the Snap Keyring in the fixture
  // before this test can run. The Detox original was also it.skip for the same reason.
  appiumTest.skip(
    'should switch between 2 accounts and reflect in the dapp',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          await SolanaTestDApp.setupAndNavigate();
          await SolanaTestDApp.connectWithAllAccounts();

          // After connecting all accounts, the dapp shows the second account as active
          await SolanaTestDApp.verifyAccount(account2Short);

          // Switch to a different account via the wallet tab
          await TabBarComponent.tapWallet();
          const accountLabelEl =
            await PlaywrightMatchers.getElementById('account-label');
          await PlaywrightGestures.waitAndTap(accountLabelEl, {
            timeout: 10_000,
          });
          // The active account (account2) is listed first; index 1 is account1
          const account1Cell = await PlaywrightMatchers.getElementById(
            'cellbase-avatar-title',
            { index: 1 },
          );
          await PlaywrightGestures.waitAndTap(account1Cell, {
            timeout: 10_000,
          });

          await navigateToBrowserView();

          // Dapp should now reflect the switched account
          await SolanaTestDApp.verifyAccount(account1Short);
        },
      );
    },
  );

  appiumTest(
    'should sign a message',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          await SolanaTestDApp.setupAndNavigate();
          await SolanaTestDApp.connect();

          await SolanaTestDApp.signMessage();
          await SolanaTestDApp.confirmSignMessage();

          const signedMessage = await SolanaTestDApp.getSignedMessage();
          const expected =
            'Kort1JYMAf3dmzKRx4WiYXW9gSfPHzxw0flAka25ymjB4d+UZpU/trFoSPk4DM7emT1c/e6Wk0bsRcLsj/h9BQ==';
          if (signedMessage !== expected) {
            throw new Error(
              `Signed message mismatch.\nExpected: ${expected}\nActual:   ${signedMessage}`,
            );
          }
        },
      );
    },
  );
});
