import { SmokeNetworkExpansion } from '../../../tags';
import StellarTestDapp from '../../../page-objects/Browser/StellarTestDapp';
import {
  account1Short,
  connectStellarTestDapp,
  navigateToStellarTestDApp,
} from '../../../flows/stellar-connection.flow';
import { Utilities } from '../../../framework';
import { withStellarAccountSnap } from '../../../helpers/stellar/common';

describe(SmokeNetworkExpansion('Stellar Wallet Standard E2E - Connect'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('Connects & disconnects from Stellar test dapp', async () => {
    await withStellarAccountSnap(async () => {
      await navigateToStellarTestDApp();

      await connectStellarTestDapp();

      await StellarTestDapp.verifyConnectedAccount(account1Short);
      await StellarTestDapp.verifyConnectionStatus('Connected');

      const header = StellarTestDapp.getHeader();
      await header.disconnect();

      await StellarTestDapp.verifyConnectionStatus('Not connected');
    });
  });

  it('Stays connected after page refresh', async () => {
    await withStellarAccountSnap(async () => {
      await navigateToStellarTestDApp();

      await connectStellarTestDapp();

      await StellarTestDapp.verifyConnectedAccount(account1Short);
      await StellarTestDapp.verifyConnectionStatus('Connected');

      await StellarTestDapp.reloadStellarTestDApp();

      await Utilities.executeWithRetry(
        async () => {
          await StellarTestDapp.verifyConnectedAccount(account1Short);
          await StellarTestDapp.verifyConnectionStatus('Connected');
        },
        {
          timeout: 10000,
          interval: 1500,
        },
      );
    });
  });

  it('Switches network while connected', async () => {
    await withStellarAccountSnap(async () => {
      await navigateToStellarTestDApp();

      await connectStellarTestDapp();

      await StellarTestDapp.verifyConnectionStatus('Connected');

      await StellarTestDapp.selectNetwork('pubnet');

      await Utilities.executeWithRetry(
        async () => {
          await StellarTestDapp.verifyConnectedAccount(account1Short);
          await StellarTestDapp.verifyConnectionStatus('Connected');
        },
        {
          timeout: 10000,
          interval: 1500,
        },
      );
    });
  });
});
