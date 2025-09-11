import { SmokeAccounts } from '../../tags.js';
import WalletView from '../../pages/wallet/WalletView';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import Assertions from '../../framework/Assertions';
import { withMultichainAccountDetailsV2Enabled } from '../multichain-accounts/common';

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
        );
      }

      await AccountListBottomSheet.tapOnAccountMenu(LAST);
      //MULTICHAIN_ACCOUNT_ACTIONS_ACCOUNT_DETAILS

      await AccountListBottomSheet.tapAccountByNameV2(visibleAccounts[LAST]);
      await Assertions.expectElementToHaveText(
        WalletView.accountName,
        visibleAccounts[LAST],
      );
    });
  });
});
