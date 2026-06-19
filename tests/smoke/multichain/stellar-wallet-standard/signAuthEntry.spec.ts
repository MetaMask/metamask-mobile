import { SmokeNetworkExpansion } from '../../../tags';
import StellarTestDapp from '../../../page-objects/Browser/StellarTestDapp';
import {
  connectStellarTestDapp,
  exampleAuthEntryXdr,
  navigateToStellarTestDApp,
} from '../../../flows/stellar-connection.flow';
import { withStellarAccountSnap } from '../../../helpers/stellar/common';

describe(
  SmokeNetworkExpansion('Stellar Wallet Standard E2E - Sign Auth Entry'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(150000);
    });

    it('Signs a Soroban auth entry', async () => {
      await withStellarAccountSnap(async () => {
        await navigateToStellarTestDApp();

        await connectStellarTestDapp();

        await device.disableSynchronization();
        try {
          await StellarTestDapp.fillAuthEntry(exampleAuthEntryXdr);
          await StellarTestDapp.signAuthEntry();
          await StellarTestDapp.confirmSignAuthEntry();
          await StellarTestDapp.verifySignedAuthEntryMatches(
            /^[A-Za-z0-9+/=]+$/,
          );
        } finally {
          await device.enableSynchronization();
        }
      });
    });
  },
);
