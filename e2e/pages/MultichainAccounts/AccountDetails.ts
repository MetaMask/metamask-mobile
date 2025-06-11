import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { AccountDetailsIds } from '../../selectors/MultichainAccounts/AccountDetails.selectors';
import { MultichainDeleteAccountsSelectors } from '../../selectors/MultichainAccounts/DeleteAccount.selectors';

class AddNewHdAccountComponent {
  get container() {
    return Matchers.getElementByID(AccountDetailsIds.ACCOUNT_DETAILS_CONTAINER);
  }

  get shareAddress() {
    return Matchers.getElementByID(AccountDetailsIds.ACCOUNT_ADDRESS_LINK);
  }

  get editAccountName() {
    return Matchers.getElementByID(AccountDetailsIds.ACCOUNT_NAME_LINK);
  }

  get editWalletName() {
    return Matchers.getElementByID(AccountDetailsIds.WALLET_NAME_LINK);
  }

  get backButton() {
    return Matchers.getElementByID(AccountDetailsIds.BACK_BUTTON);
  }

  get deleteAccount() {
    return Matchers.getElementByID(
      MultichainDeleteAccountsSelectors.deleteAccountButton,
    );
  }

  async tapShareAddress() {
    await Gestures.waitAndTap(this.shareAddress);
  }

  async tapEditAccountName() {
    await Gestures.waitAndTap(this.editAccountName);
  }

  async tapEditWalletName() {
    await Gestures.waitAndTap(this.editWalletName);
  }

  async tapBackButton() {
    await Gestures.waitAndTap(this.backButton);
  }

  async tapDeleteAccount() {
    await Gestures.waitAndTap(this.deleteAccount);
  }
}

export default new AddNewHdAccountComponent();
