import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { AccountDetailsIds } from '../../selectors/MultichainAccounts/AccountDetails.selectors';
import { ExportCredentialsIds } from '../../selectors/MultichainAccounts/ExportCredentials.selectors';

class AccountDetails {
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

  get deleteAccountLink() {
    return Matchers.getElementByID(AccountDetailsIds.REMOVE_ACCOUNT_BUTTON);
  }

  get exportPrivateKeyButton() {
    return Matchers.getElementByID(
      ExportCredentialsIds.EXPORT_PRIVATE_KEY_BUTTON,
    );
  }

  get exportSrpButton() {
    return Matchers.getElementByID(ExportCredentialsIds.EXPORT_SRP_BUTTON);
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

  async tapDeleteAccountLink() {
    await Gestures.waitAndTap(this.deleteAccountLink);
  }

  async tapExportPrivateKeyButton() {
    await Gestures.waitAndTap(this.exportPrivateKeyButton);
  }

  async tapExportSrpButton() {
    await Gestures.waitAndTap(this.exportSrpButton);
  }
}

export default new AccountDetails();
