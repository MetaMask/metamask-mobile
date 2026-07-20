import { SmokeNetworkExpansion } from '../../../tags';
import StellarTestDapp from '../../../page-objects/Browser/StellarTestDapp';
import {
  account1Short,
  connectStellarTestDapp,
  navigateToStellarTestDApp,
} from '../../../flows/stellar-connection.flow';
import { loginToApp } from '../../../flows/wallet.flow';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { DappVariants } from '../../../framework/Constants';

describe(SmokeNetworkExpansion('Stellar Wallet Standard E2E - Connect'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('Connects & disconnects from Stellar test dapp', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withStellarEnabled().build(),
        restartDevice: true,
        dapps: [
          {
            dappVariant: DappVariants.STELLAR_TEST_DAPP,
          },
        ],
      },
      async () => {
        await loginToApp();
        await navigateToStellarTestDApp();

        await connectStellarTestDapp();

        await StellarTestDapp.verifyConnectedAccount(account1Short);
        await StellarTestDapp.verifyConnectionStatus('Connected');

        const header = StellarTestDapp.getHeader();
        await header.disconnect();

        await StellarTestDapp.verifyConnectionStatus('Not connected');
      },
    );
  });

  it('Stays connected after page refresh', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withStellarEnabled().build(),
        restartDevice: true,
        dapps: [
          {
            dappVariant: DappVariants.STELLAR_TEST_DAPP,
          },
        ],
      },
      async () => {
        await loginToApp();
        await navigateToStellarTestDApp();

        await connectStellarTestDapp();

        await StellarTestDapp.verifyConnectedAccount(account1Short);
        await StellarTestDapp.verifyConnectionStatus('Connected');

        await StellarTestDapp.reloadStellarTestDApp();

        await StellarTestDapp.verifyConnectedAccount(account1Short);
        await StellarTestDapp.verifyConnectionStatus('Connected');
      },
    );
  });
});
