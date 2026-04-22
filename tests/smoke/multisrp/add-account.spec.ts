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

          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.getAccountElementByAccountNameV2(
              'Account 2',
            ),
            {
              description: 'Account 2 should be visible',
            },
          );
        },
      );
    });
  },
);
