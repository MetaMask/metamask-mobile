import { SmokeNetworkExpansion } from '../../../tags';
import SolanaTestDApp from '../../../pages/Browser/SolanaTestDApp';
import { connectSolanaTestDapp, navigateToSolanaTestDApp } from './testHelpers';
import { loginToApp } from '../../../viewHelper';
import { setupRemoteFeatureFlagsMock } from '../../../../tests/api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureMultichainAccountsAccountDetailsV2 } from '../../../../tests/api-mocking/mock-responses/feature-flags-mocks';
import { DappVariants } from '../../../../tests/framework/Constants';
import FixtureBuilder from '../../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../../tests/framework/fixtures/FixtureHelper';
import Assertions from '../../../../tests/framework/Assertions';

describe(
  SmokeNetworkExpansion('Solana Wallet Standard E2E - Transfer SOL'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(150000);
    });

    it('Should sign a transaction', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
          dapps: [
            {
              dappVariant: DappVariants.SOLANA_TEST_DAPP,
            },
          ],
          testSpecificMock: async (mockServer) => {
            await setupRemoteFeatureFlagsMock(mockServer, {
              ...remoteFeatureMultichainAccountsAccountDetailsV2(true),
            });
          },
        },
        async () => {
          await loginToApp();
          await navigateToSolanaTestDApp();
          await connectSolanaTestDapp();

          await device.disableSynchronization(); // Synchronization is preventing from reading the MetaMask bottom sheet

          const sendSolTest = SolanaTestDApp.getSendSolTest();
          await sendSolTest.signTransaction();

          // TODO: Actually sign the transaction (blocked by https://consensyssoftware.atlassian.net/browse/MMQA-586)
          await SolanaTestDApp.tapCancelButton();
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
          testSpecificMock: async (mockServer) => {
            await setupRemoteFeatureFlagsMock(mockServer, {
              ...remoteFeatureMultichainAccountsAccountDetailsV2(true),
            });
          },
        },
        async () => {
          await loginToApp();
          await navigateToSolanaTestDApp();
          await connectSolanaTestDapp();

          await device.disableSynchronization(); // Synchronization is preventing from reading the MetaMask bottom sheet

          const sendSolTest = SolanaTestDApp.getSendSolTest();
          await sendSolTest.sendTransaction();

          await Assertions.expectTextDisplayed('Transaction request');

          await SolanaTestDApp.tapCancelButton();
        },
      );
    });
  },
);
