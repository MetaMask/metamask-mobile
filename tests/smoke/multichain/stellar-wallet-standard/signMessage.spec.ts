import { SmokeNetworkExpansion } from '../../../tags';
import StellarTestDapp from '../../../page-objects/Browser/StellarTestDapp';
import {
  connectStellarTestDapp,
  navigateToStellarTestDApp,
} from '../../../flows/stellar-connection.flow';
import { withStellarAccountSnap } from '../../../helpers/stellar/common';

describe(
  SmokeNetworkExpansion('Stellar Wallet Standard E2E - Sign Message'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(150000);
    });

    it('Signs a message', async () => {
      await withStellarAccountSnap(async () => {
        await navigateToStellarTestDApp();

        await connectStellarTestDapp();

        await device.disableSynchronization();
        try {
          await StellarTestDapp.signMessage();
          await StellarTestDapp.confirmSignMessage();
          await StellarTestDapp.verifySignedMessageMatches(/^[A-Za-z0-9+/=]+$/);
        } finally {
          await device.enableSynchronization();
        }
      });
    });
  },
);
