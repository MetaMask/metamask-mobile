import { SmokeAccounts } from '../../tags.js';
import WalletView from '../../pages/wallet/WalletView';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import Assertions from '../../framework/Assertions';
import { withMultichainAccountDetailsV2EnabledFixtures } from '../multichain-accounts/common';
import AccountDetails from '../../pages/MultichainAccounts/AccountDetails';
import AddressList from '../../pages/MultichainAccounts/AddressList';
import { defaultGanacheOptions } from '../../framework/Constants';
import { completeSrpQuiz } from '../multisrp/utils';

describe(SmokeAccounts('Create wallet accounts'), () => {
  const FIRST = 0;
  const LAST = 2;

  it('should be able to add a new account and verify it is working', async () => {
    await withMultichainAccountDetailsV2EnabledFixtures(async () => {
      await Assertions.expectElementToBeVisible(
        AccountListBottomSheet.accountList,
        {
          description: 'Account list should be visible',
        },
      );
      await AccountListBottomSheet.tapCreateAccount(FIRST);

      // Account names are now per wallet, thus other accounts from the fixture (that are not associated
      // with the primary HD keyring) are not considered for account index. Current fixture uses 2 HD
      // accounts, thus the next one is: "Account 3".
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
      await AccountDetails.tapNetworksLink();

      const visibleNetworks = [
        'Ethereum Main Network',
        'Linea Main Network',
        'Solana',
      ];
      for (const networkName of visibleNetworks) {
        await Assertions.expectTextDisplayed(networkName, {
          description: `Network ${networkName} should be visible`,
        });
      }
      await AddressList.tapBackButton();

      await AccountDetails.tapAccountSrpLink();
      await completeSrpQuiz(defaultGanacheOptions.mnemonic);

      await WalletView.tapIdenticon();
      await AccountListBottomSheet.tapAccountByNameV2(visibleAccounts[LAST]);
      await Assertions.expectElementToBeVisible(WalletView.container, {
        description: 'Wallet container should be visible',
      });

      await Assertions.expectElementToHaveText(
        WalletView.accountName,
        visibleAccounts[LAST],
        {
          description: `Expect selected account to be ${visibleAccounts[LAST]}`,
        },
      );
    });
  });
});
