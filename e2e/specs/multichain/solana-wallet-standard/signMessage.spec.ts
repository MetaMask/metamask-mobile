'use strict';
import { SmokeNetworkExpansion } from '../../../tags';
import SolanaTestDApp from '../../../pages/Browser/SolanaTestDApp';
import { connectSolanaTestDapp, navigateToSolanaTestDApp } from './testHelpers';
import Gestures from '../../../utils/Gestures';
import Matchers from '../../../utils/Matchers';
import Assertions from '../../../utils/Assertions';
import { withSolanaAccountSnap } from '../../../common-solana';

describe(
  SmokeNetworkExpansion('Solana Wallet Standard E2E - Sign Message'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(150000);
    });

    describe('Sign Message', () => {
      it('Should sign a message', async () => {
        await withSolanaAccountSnap({},
          async () => {
            await navigateToSolanaTestDApp();

            await connectSolanaTestDapp();

            const signMessageTest = SolanaTestDApp.getSignMessageTest();
            await signMessageTest.signMessage();

            // Confirm the signature
            // const confirmButton = Matchers.getElementByText('Confirm');
            const confirmButton = Matchers.getElementByID('confirm-sign-message-confirm-snap-footer-button');
            await Gestures.waitAndTap(confirmButton);

            const signedMessage = await signMessageTest.getSignedMessage();
            await Assertions.checkIfTextIsDisplayed('Sign message', 100);
            await Assertions.checkIfTextMatches(
              signedMessage,
              'Kort1JYMAf3dmzKRx4WiYXW9gSfPHzxw0flAka25ymjB4d+UZpU/trFoSPk4DM7emT1c/e6Wk0bsRcLsj/h9BQ==',
            );
          },
        );
      });
    });
  },
);
