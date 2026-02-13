import { SmokeNetworkExpansion } from '../../../tags';
import TronTestDApp from '../../../page-objects/Browser/TronTestDApp';
import { loginToApp } from '../../../flows/wallet.flow';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import {
  account1Short,
  connectTronTestDapp,
  navigateToTronTestDApp,
} from './testHelpers';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { DappVariants } from '../../../framework/Constants';

describe(SmokeNetworkExpansion('Tron Connect E2E - Connect'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('Disconnects and connects again', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        dapps: [
          {
            dappVariant: DappVariants.TRON_TEST_DAPP,
          },
        ],
      },
      async () => {
        await loginToApp();
        await navigateToTronTestDApp();

        // 1. Connect
        await connectTronTestDapp();

        // Verify we are connected
        await TronTestDApp.verifyConnectedAccount(account1Short);
        await TronTestDApp.verifyConnectionStatus('Connected');

        // 2. Disconnect
        await TronTestDApp.disconnect();

        // Verify we are disconnected
        await TronTestDApp.verifyConnectionStatus('Not connected');

        // 3. Connect again
        await connectTronTestDapp();

        // Verify we are connected again
        await TronTestDApp.verifyConnectionStatus('Connected');
      },
    );
  });

  it('Restores the session after refreshing the page', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        dapps: [
          {
            dappVariant: DappVariants.TRON_TEST_DAPP,
          },
        ],
      },
      async () => {
        await loginToApp();
        await navigateToTronTestDApp();

        // 1. Connect
        await connectTronTestDapp();

        // Verify we are connected
        await TronTestDApp.verifyConnectedAccount(account1Short);
        await TronTestDApp.verifyConnectionStatus('Connected');

        // Refresh the page
        await TronTestDApp.reloadTronTestDApp();

        // Verify we are still connected
        await TronTestDApp.verifyConnectionStatus('Connected');
      },
    );
  });
});
