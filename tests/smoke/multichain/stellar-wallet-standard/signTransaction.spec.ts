import { SmokeNetworkExpansion } from '../../../tags';
import StellarTestDapp from '../../../page-objects/Browser/StellarTestDapp';
import {
  connectStellarTestDapp,
  navigateToStellarTestDApp,
} from '../../../flows/stellar-connection.flow';
import { withStellarAccountSnap } from '../../../helpers/stellar/common';

describe(
  SmokeNetworkExpansion('Stellar Wallet Standard E2E - Sign Transaction'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(150000);
    });

    it('Signs a transaction', async () => {
      await withStellarAccountSnap(async () => {
        await navigateToStellarTestDApp();

        await connectStellarTestDapp();

        await device.disableSynchronization();
        try {
          await StellarTestDapp.loadExampleXdr();
          await StellarTestDapp.signTransaction();
          await StellarTestDapp.confirmTransaction();
          await StellarTestDapp.verifySignedTransactionMatches(
            /^[A-Za-z0-9+/=]+$/,
          );
        } finally {
          await device.enableSynchronization();
        }
      });
    });
  },
);
