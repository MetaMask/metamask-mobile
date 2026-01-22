import { SmokeNetworkExpansion } from '../../../tags';
import SolanaTestDApp from '../../../pages/Browser/SolanaTestDApp';
import { connectSolanaTestDapp, navigateToSolanaTestDApp } from './testHelpers';
import Assertions from '../../../framework/Assertions';
import { withSolanaAccountEnabled } from '../../../common-solana';
import { logger } from '../../../framework/logger';

describe(
  SmokeNetworkExpansion('Solana Wallet Standard E2E - Sign Message'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(150000);
    });

    it('Should sign a message', async () => {
      await withSolanaAccountEnabled({}, async () => {
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
      });
    });
  },
);
