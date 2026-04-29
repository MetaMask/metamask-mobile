import { SmokeNetworkExpansion } from '../../../tags';
import SolanaTestDApp from '../../../page-objects/Browser/SolanaTestDApp';
import {
  connectSolanaTestDapp,
  navigateToSolanaTestDApp,
} from '../../../flows/solana-connection.flow';
import Assertions from '../../../framework/Assertions';
import { logger } from '../../../framework/logger';
import { loginToApp } from '../../../flows/wallet.flow';
import { DappVariants } from '../../../framework/Constants';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';

describe(
  SmokeNetworkExpansion('Solana Wallet Standard E2E - Sign Message'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(150000);
    });

    it('Should sign a message', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
          dapps: [
            {
              dappVariant: DappVariants.SOLANA_TEST_DAPP,
            },
          ],
        },
        async () => {
          await loginToApp();

          // Detox sync waits for the main run loop to idle; browser + WebView + snap modal
          // often keep work pending on the main queue (see "app is busy" in CI). Disable sync
          // for the whole dapp flow, not only the confirmation tap.
          await device.disableSynchronization();
          try {
            await navigateToSolanaTestDApp();

            await connectSolanaTestDapp();

            const signMessageTest = SolanaTestDApp.getSignMessageTest();
            await signMessageTest.signMessage();
            await SolanaTestDApp.confirmSignMessage();

            const signedMessage = await signMessageTest.getSignedMessage();
            logger.debug(`signedMessage: ${signedMessage}`);
            await Assertions.checkIfTextMatches(
              signedMessage,
              'Kort1JYMAf3dmzKRx4WiYXW9gSfPHzxw0flAka25ymjB4d+UZpU/trFoSPk4DM7emT1c/e6Wk0bsRcLsj/h9BQ==',
            );
          } finally {
            await device.enableSynchronization();
          }
        },
      );
    });
  },
);
