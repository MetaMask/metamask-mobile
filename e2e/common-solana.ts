import FixtureBuilder from './framework/fixtures/FixtureBuilder';
import { withFixtures } from './framework/fixtures/FixtureHelper';
import { loginToApp } from './viewHelper';
import TestHelpers from './helpers';
import WalletView from './pages/wallet/WalletView';
import AccountListBottomSheet from './pages/wallet/AccountListBottomSheet';
import { DappVariants } from './framework/Constants';
import Assertions from './framework/Assertions';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from './api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureMultichainAccountsAccountDetailsV2 } from './api-mocking/mock-responses/feature-flags-mocks';

const testSpecificMock = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(
    mockServer,
    remoteFeatureMultichainAccountsAccountDetailsV2(true),
  );
};

export async function withSolanaAccountEnabled(
  {
    numberOfAccounts = 1,
    solanaAccountPermitted,
    evmAccountPermitted,
    dappVariant,
  }: {
    numberOfAccounts?: number;
    solanaAccountPermitted?: boolean;
    evmAccountPermitted?: boolean;
    dappVariant?: DappVariants;
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
      testSpecificMock,
    },
    async () => {
      await TestHelpers.reverseServerPort();
      await loginToApp();
      await WalletView.tapCurrentMainWalletAccountActions();

      // Create Solana accounts through the wallet view
      for (let i = 0; i < numberOfAccounts; i++) {
        // Open account list for each account creation

        await AccountListBottomSheet.tapAddAccountButtonV2();

        await Assertions.expectTextDisplayed(`Account ${i + 1}`);
      }
      await AccountListBottomSheet.dismissAccountListModalV2();

      await test();
    },
  );
}
