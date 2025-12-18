import { SmokeNetworkExpansion } from '../../../tags';
import SolanaTestDApp from '../../../pages/Browser/SolanaTestDApp';
import { connectSolanaTestDapp, navigateToSolanaTestDApp } from './testHelpers';
import { withSolanaAccountEnabled } from '../../../common-solana';
import Assertions from '../../../framework/Assertions';

// TODO: Update test to be BIP-44 compatible
// https://github.com/MetaMask/metamask-mobile/issues/24150
// eslint-disable-next-line jest/no-disabled-tests
describe.skip(
  SmokeNetworkExpansion('Solana Wallet Standard E2E - Transfer SOL'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(150000);
    });

    it('Should sign a transaction', async () => {
      await withSolanaAccountEnabled({}, async () => {
        await navigateToSolanaTestDApp();
        await connectSolanaTestDapp();

        await device.disableSynchronization(); // Synchronization is preventing from reading the MetaMask bottom sheet

        const sendSolTest = SolanaTestDApp.getSendSolTest();
        await sendSolTest.signTransaction();

        // TODO: Actually sign the transaction (blocked by https://consensyssoftware.atlassian.net/browse/MMQA-586)
        await SolanaTestDApp.tapCancelButton();
      });
    });

    // TODO: Enable when devnet is supported on mobile (https://github.com/MetaMask/metamask-mobile/issues/15002)
    // TODO:
    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('Should send a transaction', async () => {
      await withSolanaAccountEnabled({}, async () => {
        await navigateToSolanaTestDApp();
        await connectSolanaTestDapp();

        await device.disableSynchronization(); // Synchronization is preventing from reading the MetaMask bottom sheet

        const sendSolTest = SolanaTestDApp.getSendSolTest();
        await sendSolTest.sendTransaction();

        await Assertions.expectTextDisplayed('Transaction request');

        await SolanaTestDApp.tapCancelButton();
      });
    });
  },
);
