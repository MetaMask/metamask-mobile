'use strict';
import { SmokeNetworkExpansion } from '../../../tags';
import SolanaTestDApp from '../../../pages/Browser/SolanaTestDApp';
import { connectSolanaTestDapp, navigateToSolanaTestDApp } from './testHelpers';
import { withSolanaAccountSnap } from '../../../common-solana';
import Assertions from '../../../utils/Assertions';

describe(
  SmokeNetworkExpansion('Solana Wallet Standard E2E - Transfer SOL'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(150000);
    });

    describe('Send a transaction', () => {
      it('Should sign a transaction', async () => {
        await withSolanaAccountSnap({}, async () => {
          await navigateToSolanaTestDApp();
          await connectSolanaTestDapp();

          await device.disableSynchronization(); // Synchronization is preventing from reading the MetaMask bottom sheet

          const sendSolTest = SolanaTestDApp.getSendSolTest();
          await sendSolTest.signTransaction();

          await Assertions.checkIfTextIsDisplayed('Transaction request');

          await SolanaTestDApp.cancelTransaction();
        });
      });

      // TODO: Enable when devnet is supported on mobile
      it.skip('Should send a transaction', async () => {
        await withSolanaAccountSnap({}, async () => {
          await navigateToSolanaTestDApp();
          await connectSolanaTestDapp();

          await device.disableSynchronization(); // Synchronization is preventing from reading the MetaMask bottom sheet

          const sendSolTest = SolanaTestDApp.getSendSolTest();
          await sendSolTest.sendTransaction();

          await Assertions.checkIfTextIsDisplayed('Transaction request');

          await SolanaTestDApp.cancelTransaction();
        });
      });
    });
  },
);
