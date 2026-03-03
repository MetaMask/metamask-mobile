import { SmokeNetworkExpansion } from '../../../tags';
import BitcoinTestDapp from '../../../page-objects/Browser/BitcoinTestDapp';
import {
  account1Short,
  connectBitcoinTestDapp,
  navigateToBitcoinTestDApp,
} from '../../../flows/bitcoin-connection.flow';
import { loginToApp } from '../../../flows/wallet.flow';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { DappVariants } from '../../../framework/Constants';

describe(SmokeNetworkExpansion('Bitcoin Wallet Standard E2E - Connect'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('Connects & disconnects from Bitcoin test dapp', async () => {
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

        // Check we're connected
        await BitcoinTestDapp.verifyConnectedAccount(account1Short);
        await BitcoinTestDapp.verifyConnectionStatus('Connected');

        const header = BitcoinTestDapp.getHeader();
        await header.disconnect();

        await BitcoinTestDapp.verifyConnectionStatus('Not connected');
      },
    );
  });
});
