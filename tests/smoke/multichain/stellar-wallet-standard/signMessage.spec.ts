import { SmokeNetworkExpansion } from '../../../tags';
import StellarTestDapp from '../../../page-objects/Browser/StellarTestDapp';
import {
  connectStellarTestDapp,
  navigateToStellarTestDApp,
} from '../../../flows/stellar-connection.flow';
import { loginToApp } from '../../../flows/wallet.flow';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { DappVariants } from '../../../framework/Constants';

describe(
  SmokeNetworkExpansion('Stellar Wallet Standard E2E - Sign Message'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(150000);
    });

    it('Signs a message', async () => {
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

          await device.disableSynchronization();
          try {
            await StellarTestDapp.signMessage();
            await StellarTestDapp.confirmSignMessage();
            await StellarTestDapp.verifySignedMessageMatches(
              /^[A-Za-z0-9+/=]+$/,
            );
          } finally {
            await device.enableSynchronization();
          }
        },
      );
    });
  },
);
