import FixtureBuilder from './framework/fixtures/FixtureBuilder';
import { withFixtures } from './framework/fixtures/FixtureHelper';
import { loginToApp } from './viewHelper';
import TestHelpers from './helpers';
import WalletView from './pages/wallet/WalletView';
import AccountListBottomSheet from './pages/wallet/AccountListBottomSheet';
import { DappVariants } from './framework/Constants';
import { remoteFeatureMultichainAccountsAccountDetailsV2 } from './api-mocking/mock-responses/feature-flags-mocks';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from './api-mocking/helpers/remoteFeatureFlagsHelper';

export async function withSolanaAccountEnabled(
  {
    numberOfAccounts = 1,
    solanaAccountPermitted,
    evmAccountPermitted,
    dappVariant,
    skipAccountsCreation,
  }: {
    numberOfAccounts?: number;
    solanaAccountPermitted?: boolean;
    evmAccountPermitted?: boolean;
    dappVariant?: DappVariants;
    skipAccountsCreation?: boolean;
  },
  test: () => Promise<void>,
) {
  let fixtureBuilder = new FixtureBuilder().withSolanaFixture();

  if (solanaAccountPermitted) {
    fixtureBuilder = fixtureBuilder.withSolanaAccountPermission();
  }
  if (evmAccountPermitted) {
    fixtureBuilder = fixtureBuilder.withChainPermission(['0x1']);
  }
  const fixtures = fixtureBuilder.build();

  await withFixtures(
    {
      fixture: fixtures,
      dapps: [
        {
          dappVariant: dappVariant || DappVariants.SOLANA_TEST_DAPP, // Default to the Solana test dapp if no variant is provided
        },
      ],
      restartDevice: true,
      testSpecificMock: async (mockServer: Mockttp) => {
        if (!skipAccountsCreation) {
          // We use this only in tests that are checking multichain accounts state 1 code
          await setupRemoteFeatureFlagsMock(
            mockServer,
            remoteFeatureMultichainAccountsAccountDetailsV2(),
          );
        }
      },
    },
    async () => {
      await TestHelpers.reverseServerPort();
      await loginToApp();

      // Create Solana accounts through the wallet view
      // This is multichain accounts state 2 code, so we need to use it conditionally
      if (!skipAccountsCreation) {
        for (let i = 0; i < numberOfAccounts; i++) {
          await WalletView.tapCurrentMainWalletAccountActions();
          await AccountListBottomSheet.tapAddAccountButtonV2();
          await AccountListBottomSheet.tapAccountByNameV2(`Account ${i + 1}`);
        }
      }

      await test();
    },
  );
}
