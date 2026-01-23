import FixtureBuilder from '../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../tests/framework/fixtures/FixtureHelper';
import { loginToApp } from './viewHelper';
import TestHelpers from './helpers';
import WalletView from './pages/wallet/WalletView';
import AccountListBottomSheet from './pages/wallet/AccountListBottomSheet';
import AddAccountBottomSheet from './pages/wallet/AddAccountBottomSheet';
import AddNewHdAccountComponent from './pages/wallet/MultiSrp/AddAccountToSrp/AddNewHdAccountComponent';
import { DappVariants } from '../tests/framework/Constants';

/**
 * This function creates a new Solana account and connects it to the test dapp.
 *
 * @deprecated This helper is only relevant in a BIP-44 disabled environment.
 * Do not use it for new tests.
 *
 * @param numberOfAccounts - The number of Solana accounts to create
 * @param solanaAccountPermitted - Whether the Solana account is permitted
 * @param evmAccountPermitted - Whether the EVM account is permitted
 * @param dappVariant - The dapp variant to use
 */
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
    },
    async () => {
      await TestHelpers.reverseServerPort();
      await loginToApp();

      // Create Solana accounts through the wallet view
      for (let i = 0; i < numberOfAccounts; i++) {
        await WalletView.tapCurrentMainWalletAccountActions();
        await AccountListBottomSheet.tapAddAccountButton();
        await AddAccountBottomSheet.tapAddSolanaAccount();
        await AddNewHdAccountComponent.tapConfirm();
      }

      await test();
    },
  );
}
