import { SmokeAccounts } from '../../tags';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet';
import Assertions from '../../framework/Assertions';
import WalletView from '../../page-objects/wallet/WalletView';
import AccountDetails from '../../page-objects/MultichainAccounts/AccountDetails';
import WalletDetails from '../../page-objects/MultichainAccounts/WalletDetails';
import { completeSrpQuiz } from '../../flows/accounts.flow';
import { defaultGanacheOptions } from '../../framework/Constants';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { loginToApp } from '../../flows/wallet.flow';

describe(SmokeAccounts('Wallet details'), () => {
  const FIRST = 0;

  it('goes to the wallet details, creates an account and exports srp', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountOneQrAccountOneSimpleKeyPairAccount()
          .build(),
        restartDevice: true,
      },
      async () => {
        await device.disableSynchronization();
        await loginToApp();
        await WalletView.tapIdenticon();

        await Assertions.expectElementToBeVisible(
          AccountListBottomSheet.accountList,
          {
            description: 'Account list should be visible',
          },
        );
        await AccountListBottomSheet.tapAccountEllipsisButtonV2(FIRST);
        await AccountDetails.tapEditWalletName();
        await Assertions.expectTextDisplayed('Wallet 1', {
          description: `Wallet 1 should be visible`,
        });

        await WalletDetails.tapCreateAccount();
        const visibleAccounts = ['Account 1', 'Account 2', 'Account 3'];
        for (const accountName of visibleAccounts) {
          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.getAccountElementByAccountNameV2(
              accountName,
            ),
            {
              description: `Account ${accountName} should be visible`,
            },
          );
        }

        await WalletDetails.tapSRP();
        await completeSrpQuiz(defaultGanacheOptions.mnemonic);

        await WalletView.tapIdenticon();
        for (const accountName of visibleAccounts) {
          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.getAccountElementByAccountNameV2(
              accountName,
            ),
            {
              description: `Account ${accountName} should be visible`,
            },
          );
        }
      },
    );
  });
});
