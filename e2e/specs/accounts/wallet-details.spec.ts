import { SmokeAccounts } from '../../tags';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import Assertions from '../../framework/Assertions';
import { withMultichainAccountDetailsV2EnabledFixtures } from '../multichain-accounts/common';
import WalletView from '../../pages/wallet/WalletView';
import AccountDetails from '../../pages/MultichainAccounts/AccountDetails';
import WalletDetails from '../../pages/MultichainAccounts/WalletDetails';
import { completeSrpQuiz } from '../multisrp/utils';
import { defaultGanacheOptions } from '../../framework/Constants';

describe(SmokeAccounts('Wallet details'), () => {
  const FIRST = device.getPlatform() === 'android' ? 2 : 0;

  it('should go to the wallet details, create an account and export srp', async () => {
    await withMultichainAccountDetailsV2EnabledFixtures(async () => {
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
          AccountListBottomSheet.getAccountElementByAccountNameV2(accountName),
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
          AccountListBottomSheet.getAccountElementByAccountNameV2(accountName),
          {
            description: `Account ${accountName} should be visible`,
          },
        );
      }
    });
  });
});
