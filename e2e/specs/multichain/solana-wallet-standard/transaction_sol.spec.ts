'use strict';
import { SmokeNetworkExpansion } from '../../../tags';
import SolanaTestDApp from '../../../pages/Browser/SolanaTestDApp';
import { connectSolanaTestDapp, navigateToSolanaTestDApp } from './testHelpers';
import Gestures from '../../../utils/Gestures';
import Matchers from '../../../utils/Matchers';
import { withSolanaAccountSnap } from '../../../common-solana';
import FooterActions from '../../../pages/Browser/Confirmations/FooterActions';
import Assertions from '../../../utils/Assertions';
import TestHelpers from '../../../helpers';

describe(
  SmokeNetworkExpansion('Solana Wallet Standard E2E - Transfer SOL'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(150000);
    });

    describe('Send a transaction', () => {
      it('Should send a transaction', async () => {
        await withSolanaAccountSnap({},
          async () => {
            await navigateToSolanaTestDApp();

            await connectSolanaTestDapp();

            const sendSolTest = SolanaTestDApp.getSendSolTest();
            await sendSolTest.signTransaction();

            await TestHelpers.delay(3000);
            console.log('looking for cancel button');
            // await FooterActions.tapCancelButton();

            // const cancelButton = Matchers.getElementByText('Cancel');
            const cancelButton = Matchers.getElementByID('confirm-sign-and-send-transaction-cancel-snap-footer-button');
            await Gestures.waitAndTap(cancelButton);
            console.log('tapped cancel button');


            await TestHelpers.delay(2000);

            // const element = Matchers.getElementByXPath('//*[@text="Transaction request"]');
            // await Assertions.checkIfTextIsDisplayed('Transaction request', 100);
          },
        );
      });
    });
  },
);
