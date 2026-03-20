import { SmokeNetworkExpansion } from '../../../tags';
import SolanaTestDApp from '../../../page-objects/Browser/SolanaTestDApp';
import {
  connectSolanaTestDapp,
  navigateToSolanaTestDApp,
} from '../../../flows/solana-connection.flow';
import { loginToApp } from '../../../flows/wallet.flow';
import { DappVariants } from '../../../framework/Constants';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import Assertions from '../../../framework/Assertions';

describe(
  SmokeNetworkExpansion('Solana Wallet Standard E2E - Transfer SOL'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(150000);
    });

    it('Opens sign-and-send transaction confirmation then dismisses', async () => {
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

          await device.disableSynchronization(); // Synchronization is preventing from reading the MetaMask bottom sheet

          const sendSolTest = SolanaTestDApp.getSendSolTest();
          // "Sign transaction" is sign-only; we need "Sign and send transaction" (sendTransaction)
          // so MetaMask shows the same confirmation flow cancel targets below.
          await sendSolTest.sendTransaction();

          // TODO: Actually sign the transaction (blocked by https://consensyssoftware.atlassian.net/browse/MMQA-586)
          await SolanaTestDApp.tapCancelSignAndSendTransaction();
        },
      );
    });

    // TODO: Enable when devnet is supported on mobile (https://github.com/MetaMask/metamask-mobile/issues/15002)
    it.skip('Should send a transaction', async () => {
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

          await device.disableSynchronization(); // Synchronization is preventing from reading the MetaMask bottom sheet

          const sendSolTest = SolanaTestDApp.getSendSolTest();
          await sendSolTest.sendTransaction();

          await Assertions.expectTextDisplayed('Transaction request');

          await SolanaTestDApp.tapCancelSignAndSendTransaction();
        },
      );
    });
  },
);
