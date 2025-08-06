import { SmokeAccounts } from '../../tags.js';
import WalletView from '../../pages/wallet/WalletView';
import { loginToApp } from '../../viewHelper';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import Assertions from '../../framework/Assertions';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import AddNewHdAccountComponent from '../../pages/wallet/MultiSrp/AddAccountToSrp/AddNewHdAccountComponent';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';

describe(SmokeAccounts('Create wallet accounts'), () => {
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
