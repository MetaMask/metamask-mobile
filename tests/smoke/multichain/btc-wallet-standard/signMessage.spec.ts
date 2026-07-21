import { SmokeNetworkExpansion } from '../../../tags';
import BitcoinTestDapp from '../../../page-objects/Browser/BitcoinTestDapp';
import {
  signedMessageStandard,
  connectBitcoinTestDapp,
  navigateToBitcoinTestDApp,
} from '../../../flows/bitcoin-connection.flow';
import { loginToApp } from '../../../flows/wallet.flow';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { DappVariants } from '../../../framework/Constants';

describe(
  SmokeNetworkExpansion('Bitcoin Wallet Standard E2E - Sign Message'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(150000);
    });

    it('Signs a message', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
          dapps: [
            {
              dappVariant: DappVariants.BITCOIN_TEST_DAPP,
            },
          ],
        },
        async () => {
          await loginToApp();
          await navigateToBitcoinTestDApp();

          await connectBitcoinTestDapp();

          await BitcoinTestDapp.signMessage();
          await BitcoinTestDapp.confirmSignMessage();

          await BitcoinTestDapp.verifySignedMessage(signedMessageStandard);
        },
      );
    });
  },
);
