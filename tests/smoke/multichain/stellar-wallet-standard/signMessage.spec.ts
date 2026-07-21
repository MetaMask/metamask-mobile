import { SmokeNetworkExpansion } from '../../../tags';
import StellarTestDapp from '../../../page-objects/Browser/StellarTestDapp';
import {
  connectStellarTestDapp,
  navigateToStellarTestDApp,
  waitForStellarAccountAlignment,
} from '../../../flows/stellar-connection.flow';
import { loginToApp } from '../../../flows/wallet.flow';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { DappVariants } from '../../../framework/Constants';

// Skipped: wallet_createSession for stellar:pubnet returns 5100 until a Stellar
// snap account exists. Unlike Solana there is no create-account prompt, and
// login-time XlmAccountProvider alignment is not reliable enough for smoke CI.
// Re-enable once account creation is guaranteed (or Solana-style opt-in exists).
describe.skip(
  SmokeNetworkExpansion('Stellar Wallet Standard E2E - Sign Message'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(300000);
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
          await waitForStellarAccountAlignment();
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
