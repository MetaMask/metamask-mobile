import { test as appiumTest } from '../../../framework/fixtures/playwright/index.js';
import {
  DappServer,
  DappVariants,
  TestDapps,
} from '../../../framework/index.js';
import { withStellarAccountSnap } from '../../../helpers/stellar/common.js';
import StellarTestDapp, {
  STELLAR_DAPP_PORT,
} from '../../../page-objects/Browser/StellarTestDapp.js';
import { SmokeNetworkExpansion } from '../../../tags.js';
import {
  startLocalDappServerOnWorker,
  stopLocalDappServerOnWorker,
} from '../../mm-connect/utils.js';

const ACCOUNT_1_SHORT = 'GDEM2...YE6K';
const SIGNED_RESULT_PATTERN = /^[A-Za-z0-9+/=]+$/;

// Soroban auth-entry preimage XDR for Stellar testnet.
const EXAMPLE_AUTH_ENTRY_XDR =
  'AAAACc7gMC1ZhE0yvcqRXIID3USzP7t+3BkFHqN6vt8o7NRyAAAAAAdbzRUAD0JAAAAAAAAAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAAAAh0cmFuc2ZlcgAAAAAAAAAA';

const stellarDappServer = new DappServer({
  dappCounter: 0,
  rootDirectory: TestDapps[DappVariants.STELLAR_TEST_DAPP].dappPath,
  dappVariant: DappVariants.STELLAR_TEST_DAPP,
});

appiumTest.describe(SmokeNetworkExpansion('Stellar Wallet Standard'), () => {
  appiumTest.describe.configure({ timeout: 300_000 });

  appiumTest.beforeAll(async () => {
    await startLocalDappServerOnWorker(stellarDappServer, STELLAR_DAPP_PORT);
  });

  appiumTest.afterAll(async () => {
    await stopLocalDappServerOnWorker(stellarDappServer, STELLAR_DAPP_PORT);
  });

  appiumTest(
    'Connects and disconnects from Stellar test dapp',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withStellarAccountSnap(currentDeviceDetails, async () => {
        await StellarTestDapp.navigateToDapp();
        await StellarTestDapp.connect();

        await StellarTestDapp.verifyAccount(ACCOUNT_1_SHORT);
        await StellarTestDapp.verifyConnectionStatus('Connected');

        await StellarTestDapp.disconnect();
        await StellarTestDapp.verifyConnectionStatus('Not connected');
      });
    },
  );

  appiumTest(
    'Stays connected after page refresh',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withStellarAccountSnap(currentDeviceDetails, async () => {
        await StellarTestDapp.navigateToDapp();
        await StellarTestDapp.connect();

        await StellarTestDapp.verifyAccount(ACCOUNT_1_SHORT);
        await StellarTestDapp.reload();
        await StellarTestDapp.verifyAccount(ACCOUNT_1_SHORT);
      });
    },
  );

  appiumTest(
    'Switches network while connected',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withStellarAccountSnap(currentDeviceDetails, async () => {
        await StellarTestDapp.navigateToDapp();
        await StellarTestDapp.connect();

        await StellarTestDapp.selectNetwork('pubnet');
        await StellarTestDapp.verifyAccount(ACCOUNT_1_SHORT);
        await StellarTestDapp.verifyConnectionStatus('Connected');
      });
    },
  );

  appiumTest(
    'Signs a Soroban auth entry',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withStellarAccountSnap(currentDeviceDetails, async () => {
        await StellarTestDapp.navigateToDapp();
        await StellarTestDapp.connect();

        await StellarTestDapp.fillAuthEntry(EXAMPLE_AUTH_ENTRY_XDR);
        await StellarTestDapp.signAuthEntry();
        await StellarTestDapp.confirm();
        await StellarTestDapp.verifySignedAuthEntry(SIGNED_RESULT_PATTERN);
      });
    },
  );

  appiumTest(
    'Signs a message',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withStellarAccountSnap(currentDeviceDetails, async () => {
        await StellarTestDapp.navigateToDapp();
        await StellarTestDapp.connect();

        await StellarTestDapp.signMessage();
        await StellarTestDapp.confirm();
        await StellarTestDapp.verifySignedMessage(SIGNED_RESULT_PATTERN);
      });
    },
  );

  appiumTest(
    'Signs a transaction',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withStellarAccountSnap(currentDeviceDetails, async () => {
        await StellarTestDapp.navigateToDapp();
        await StellarTestDapp.connect();

        await StellarTestDapp.loadExampleXdr();
        await StellarTestDapp.signTransaction();
        await StellarTestDapp.confirm();
        await StellarTestDapp.verifySignedTransaction(SIGNED_RESULT_PATTERN);
      });
    },
  );
});
