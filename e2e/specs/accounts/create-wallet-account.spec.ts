import { SmokeAccounts } from '../../tags.js';
import WalletView from '../../pages/wallet/WalletView';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import AccountActionsBottomSheet from '../../pages/wallet/AccountActionsBottomSheet';
import Assertions from '../../framework/Assertions';
import { withMultichainAccountDetailsV2Enabled } from '../multichain-accounts/common';
import AccountDetails from '../../pages/MultichainAccounts/AccountDetails';
import AddressList from '../../pages/MultichainAccounts/AddressList';

describe(SmokeAccounts('Create wallet accounts'), () => {
  const FIRST = 0;
  const LAST = 2;

  it('should be able to add new accounts ', async () => {
    await withMultichainAccountDetailsV2Enabled(async () => {
      await Assertions.expectElementToBeVisible(
        AccountListBottomSheet.accountList,
        {
          description: 'Account list should be visible',
        },
      );
      await AccountListBottomSheet.tapCreateAccount(FIRST);

      const visibleAccounts = ['Account 1', 'Account 2', 'Account 3'];
      for (const accountName of visibleAccounts) {
        await Assertions.expectElementToBeVisible(
          AccountListBottomSheet.getAccountElementByAccountNameV2(accountName),
          {
            description: `Account ${accountName} should be visible`,
          },
        );
      }

      await AccountListBottomSheet.tapAccountEllipsisButtonV2(LAST);
      await AccountActionsBottomSheet.tapAccountDetails();
      await AccountDetails.tapNetworksLink();

      const visibleNetworks = [
        'Ethereum Main Network',
        'Linea Main Network',
        // 'Solana', BUGBUG Solana is not showing on Android
      ];
      for (const networkName of visibleNetworks) {
        await Assertions.expectTextDisplayed(networkName, {
          description: `Network ${networkName} should be visible`,
        });
      }
      await AddressList.tapBackButton();
      await AccountDetails.tapBackButton();

      await AccountListBottomSheet.tapAccountByNameV2(visibleAccounts[LAST]);
      await Assertions.expectElementToHaveText(
        WalletView.accountName,
        visibleAccounts[LAST],
        {
          description: `Expect selected account to be ${visibleAccounts[LAST]}`,
        },
      );

      // BUBUG: Add check that after switching to Solana we are still on the same account
      // at the moment is not working
    });
  });
});
