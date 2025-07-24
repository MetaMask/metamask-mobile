import FixtureBuilder from './framework/fixtures/FixtureBuilder';
import { withFixtures } from './framework/fixtures/FixtureHelper';
import { loginToApp } from './viewHelper';
import TestHelpers from './helpers';
import SolanaNewFeatureSheet from './pages/wallet/SolanaNewFeatureSheet';
import AddNewHdAccountComponent from './pages/wallet/MultiSrp/AddAccountToSrp/AddNewHdAccountComponent';
import WalletView from './pages/wallet/WalletView';
import AccountListBottomSheet from './pages/wallet/AccountListBottomSheet';
import AddAccountBottomSheet from './pages/wallet/AddAccountBottomSheet';
import Assertions from './framework/Assertions';
import { DappVariants } from './framework/Constants';
// eslint-disable-next-line import/no-nodejs-modules
import path from 'path';

export async function withSolanaAccountEnabled(
  {
    numberOfAccounts = 1,
    dappPath,
    solanaAccountPermitted,
    evmAccountPermitted,
  }: {
    numberOfAccounts?: number;
    dappPath?: string;
    solanaAccountPermitted?: boolean;
    evmAccountPermitted?: boolean;
  },
  test: () => Promise<void>,
) {
  let fixtureBuilder = new FixtureBuilder()
    .withSolanaFixture()
    .withSolanaFeatureSheetDisplayed();

  if (solanaAccountPermitted) {
    fixtureBuilder = fixtureBuilder.withSolanaAccountPermission();
  }
  if (evmAccountPermitted) {
    fixtureBuilder = fixtureBuilder.withChainPermission(['0x1']);
  }
  const fixtures = fixtureBuilder.build();

  // Resolve the dappPath if provided to ensure it's an absolute path
  const resolvedDappPath = dappPath ? path.resolve(__dirname, dappPath) : undefined;

  await withFixtures(
    {
      fixture: fixtures,
      dapps: [
        {
          dappVariant: DappVariants.SOLANA_TEST_DAPP,
          dappPath: resolvedDappPath,
        },
      ],
      restartDevice: true,
    },
    async () => {
      await TestHelpers.reverseServerPort();
      await loginToApp();

      // Dismiss the new feature view
      await SolanaNewFeatureSheet.tapNotNowButton();

      // Create Solana accounts through the wallet view
      for (let i = 0; i < numberOfAccounts; i++) {
        await WalletView.tapCurrentMainWalletAccountActions();
        await AccountListBottomSheet.tapAddAccountButton();
        await AddAccountBottomSheet.tapAddSolanaAccount();
        await AddNewHdAccountComponent.tapConfirm();
        await Assertions.expectElementToHaveText(
          WalletView.accountName,
          `Solana Account ${i + 1}`,
        );
      }

      await test();
    },
  );
}
