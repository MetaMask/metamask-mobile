import FixtureBuilder from './fixtures/fixture-builder';
import { DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS, DEFAULT_SOLANA_TEST_DAPP_PATH, withFixtures } from './fixtures/fixture-helper';
import { loginToApp } from './viewHelper';
import TestHelpers from './helpers';
import SolanaNewFeatureSheet from './pages/wallet/SolanaNewFeatureSheet';
import AddNewHdAccountComponent from './pages/wallet/MultiSrp/AddAccountToSrp/AddNewHdAccountComponent';

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

      // Create Solana account
      await SolanaNewFeatureSheet.tapCreateAccountButton();
      await AddNewHdAccountComponent.tapConfirm();

      // TODO: Adapt for mobile
      /* for (let i = 1; i <= numberOfAccounts; i++) {
        await headerComponent.openAccountMenu();
        await accountListPage.addAccount({
          accountType: ACCOUNT_TYPE.Solana,
          accountName: `Solana ${i}`,
        });
        await headerComponent.check_accountLabel(`Solana ${i}`);
      }

      if (numberOfAccounts > 0) {
        await headerComponent.check_accountLabel(`Solana ${numberOfAccounts}`);
      } */

      await test();
    },
  );
}
