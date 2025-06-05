import FixtureBuilder from './fixtures/fixture-builder';
import {
  DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS,
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

export async function withSolanaAccountSnap(
  {
    numberOfAccounts = 1,
  }: {
    numberOfAccounts?: number;
  },
  test: () => Promise<void>,
) {
  const fixtures = new FixtureBuilder()
    .withSolanaFixture()
    .withSolanaFeatureSheetDisplayed()
    .build();

  await withFixtures(
    {
      ...DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS,
      fixture: fixtures,
      dappPath: DEFAULT_SOLANA_TEST_DAPP_PATH,
      restartDevice: true,
    },
    async () => {
      await TestHelpers.reverseServerPort();
      await loginToApp();

      // Create 1st Solana account through the new feature sheet
      await SolanaNewFeatureSheet.tapCreateAccountButton();
      await AddNewHdAccountComponent.tapConfirm();

      // Create remaining Solana accounts through the wallet view
      for (let i = 1; i < numberOfAccounts; i++) {
        await WalletView.tapCurrentMainWalletAccountActions();
        await AccountListBottomSheet.tapAddAccountButton();
        await AddAccountBottomSheet.tapAddSolanaAccount();
        await AddNewHdAccountComponent.tapConfirm();
      }

      await test();
    },
  );
}
