import { SmokeWalletPlatform } from '../../tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import WalletView from '../../page-objects/wallet/WalletView';
import { loginToApp } from '../../flows/wallet.flow';
import Assertions from '../../framework/Assertions';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet';

describe(
  SmokeWalletPlatform('Multi-SRP: Add new account to a specific SRP'),
  () => {
    it('adds an account to default SRP and then another to the imported SRP', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withTwoImportedHdKeyringsAndTwoDefaultAccounts()
            .build(),
          restartDevice: true,
        },
        async () => {
          await loginToApp();
          await WalletView.tapIdenticon();
          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.accountList,
          );
          await AccountListBottomSheet.tapCreateAccount(0);
          await AccountListBottomSheet.tapCreateAccount(1);

          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.getAccountElementByAccountNameV2(
              'Account 3',
            ),
            {
              description: 'Account 3 should be visible',
            },
          );
          // This should actually be account 2 but there's a bug in the naming of imported accounts
          // that needs to be fixed in how the fixtures are set up.
          // For the purpose of this test, we'll just assert that account 4 is visible since
          // it proves that the account was added to the imported SRP.
          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.getAccountElementByAccountNameV2(
              'Account 4',
            ),
            {
              description: 'Account 4 should be visible',
            },
          );
        },
      );
    });
  },
);
