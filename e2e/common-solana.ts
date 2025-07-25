import FixtureBuilder from './fixtures/fixture-builder';
import {
  DEFAULT_SOLANA_TEST_DAPP_PATH,
  withFixtures,
} from './fixtures/fixture-helper';
import { loginToApp } from './viewHelper';
import TestHelpers from './helpers';
import SolanaNewFeatureSheet from './pages/wallet/SolanaNewFeatureSheet';
import AddNewHdAccountComponent from './pages/wallet/MultiSrp/AddAccountToSrp/AddNewHdAccountComponent';
import WalletView from './pages/wallet/WalletView';
import AccountListBottomSheet from './pages/wallet/AccountListBottomSheet';
import AddAccountBottomSheet from './pages/wallet/AddAccountBottomSheet';
import Assertions from './utils/Assertions';

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

  await withFixtures(
    {
      fixture: fixtures,
      dapp: true,
      dappPath: dappPath ?? DEFAULT_SOLANA_TEST_DAPP_PATH,
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
        await Assertions.checkIfElementToHaveText(
          WalletView.accountName,
          `Solana Account ${i + 1}`,
        );
      }

      await test();
    },
  );
}
