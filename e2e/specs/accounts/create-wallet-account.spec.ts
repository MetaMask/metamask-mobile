import { SmokeAccounts } from '../../tags.js';
import WalletView from '../../pages/wallet/WalletView.js';
import { loginToApp } from '../../viewHelper.js';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet.js';
import Assertions from '../../framework/Assertions.ts';
import TestHelpers from '../../helpers.js';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet.js';
import { withFixtures } from '../../fixtures/fixture-helper.js';
import FixtureBuilder from '../../fixtures/fixture-builder.js';
import AddNewHdAccountComponent from '../../pages/wallet/MultiSrp/AddAccountToSrp/AddNewHdAccountComponent.ts';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal.js';

describe(SmokeAccounts('Create wallet accounts'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  it('should be able to add new accounts - EVM and Solana', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withKeyringController().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await WalletView.tapIdenticon();
        await Assertions.expectElementToBeVisible(
          AccountListBottomSheet.accountList,
          {
            description: 'Account list should be visible',
          },
        );
        await AccountListBottomSheet.tapAddAccountButton();
        await AddAccountBottomSheet.tapCreateEthereumAccount();
        await AccountListBottomSheet.tapAddAccountButton();
        await AddAccountBottomSheet.tapAddSolanaAccount();
        await AddNewHdAccountComponent.tapConfirm();
        await NetworkEducationModal.tapGotItButton();
        await WalletView.tapIdenticon();

        const visibleAccounts = ['Account 1', 'Account 2', 'Solana Account 1'];
        for (const accountName of visibleAccounts) {
          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.getAccountElementByAccountName(accountName),
            {
              description: `Account with name "${accountName}" should be visible`,
            },
          );
        }
      },
    );
  });
});
