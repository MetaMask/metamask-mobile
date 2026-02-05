import { SmokeNetworkExpansion } from '../../../tags';
import SolanaTestDApp from '../../../pages/Browser/SolanaTestDApp';
import { connectSolanaTestDapp, navigateToSolanaTestDApp } from './testHelpers';
import Assertions from '../../../../tests/framework/Assertions';
import { logger } from '../../../../tests/framework/logger';
import { loginToApp } from '../../../viewHelper';
import { DappVariants } from '../../../../tests/framework/Constants';
import FixtureBuilder from '../../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../../tests/framework/fixtures/FixtureHelper';

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
          await navigateToSolanaTestDApp();

          await connectSolanaTestDapp();

          const signMessageTest = SolanaTestDApp.getSignMessageTest();
          await signMessageTest.signMessage();

          // Confirm the signature
          await SolanaTestDApp.confirmSignMessage();

          const signedMessage = await signMessageTest.getSignedMessage();
          logger.debug(`signedMessage: ${signedMessage}`);
          await Assertions.checkIfTextMatches(
            signedMessage,
            'Kort1JYMAf3dmzKRx4WiYXW9gSfPHzxw0flAka25ymjB4d+UZpU/trFoSPk4DM7emT1c/e6Wk0bsRcLsj/h9BQ==',
          );
        },
      );
    });
  },
);
