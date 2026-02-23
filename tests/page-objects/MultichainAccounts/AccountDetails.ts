import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { AccountDetailsIds } from '../../../app/components/Views/MultichainAccounts/AccountDetails.testIds';
import { ExportCredentialsIds } from '../../../app/components/Views/MultichainAccounts/AccountDetails/ExportCredentials.testIds';

class AccountDetails {
  get container(): DetoxElement {
    return Matchers.getElementByID(AccountDetailsIds.ACCOUNT_DETAILS_CONTAINER);
  }

  get shareAddress(): DetoxElement {
    return Matchers.getElementByID(AccountDetailsIds.ACCOUNT_ADDRESS_LINK);
  }

  get editAccountName(): DetoxElement {
    return Matchers.getElementByID(AccountDetailsIds.ACCOUNT_NAME_LINK);
  }

  get editWalletName(): DetoxElement {
    return Matchers.getElementByID(AccountDetailsIds.WALLET_NAME_LINK);
  }

  get networksLink(): DetoxElement {
    return Matchers.getElementByID(AccountDetailsIds.NETWORKS_LINK);
  }

  get backButton(): DetoxElement {
    return Matchers.getElementByID(AccountDetailsIds.BACK_BUTTON);
  }

  get deleteAccountLink(): DetoxElement {
    return Matchers.getElementByID(AccountDetailsIds.REMOVE_ACCOUNT_BUTTON);
  }

  get accountSrpLink(): DetoxElement {
    return Matchers.getElementByID(
      AccountDetailsIds.SECRET_RECOVERY_PHRASE_LINK,
    );
  }

  get exportPrivateKeyButton(): DetoxElement {
    return Matchers.getElementByID(
      ExportCredentialsIds.EXPORT_PRIVATE_KEY_BUTTON,
    );
  }

  get privateKeysLink(): DetoxElement {
    return Matchers.getElementByID(AccountDetailsIds.PRIVATE_KEYS_LINK);
  }

  get exportSrpButton(): DetoxElement {
    return Matchers.getElementByID(ExportCredentialsIds.EXPORT_SRP_BUTTON);
  }

  async tapShareAddress(): Promise<void> {
    await Gestures.waitAndTap(this.shareAddress, {
      elemDescription: 'Share Address Link in Account Details',
    });
  }

  async tapEditAccountName(): Promise<void> {
    await Gestures.waitAndTap(this.editAccountName, {
      elemDescription: 'Edit Account Name Link in Account Details',
    });
  }

  async tapEditWalletName(): Promise<void> {
    await Gestures.waitAndTap(this.editWalletName, {
      elemDescription: 'Edit Wallet Name Link in Account Details',
    });
  }

  async tapBackButton(): Promise<void> {
    await Gestures.waitAndTap(this.backButton, {
      elemDescription: 'Back Button in Account Details',
    });
  }

  async tapDeleteAccountLink(): Promise<void> {
    await Gestures.waitAndTap(this.deleteAccountLink, {
      elemDescription: 'Delete Account Link in Account Details',
    });
  }

  async tapNetworksLink(): Promise<void> {
    await Gestures.waitAndTap(this.networksLink, {
      elemDescription: 'Networks Link in Account Details',
    });
  }

  async tapPrivateKeyLink(): Promise<void> {
    await Gestures.waitAndTap(this.privateKeysLink, {
      elemDescription: 'Unlock to reveal Private Keys in Account Details',
    });
  }

  async tapExportPrivateKeyButton(): Promise<void> {
    await Gestures.waitAndTap(this.exportPrivateKeyButton, {
      elemDescription: 'Export Private Key Button in Account Details',
    });
  }

  async tapExportSrpButton(): Promise<void> {
    await Gestures.waitAndTap(this.exportSrpButton, {
      elemDescription: 'Export SRP Button in Account Details',
    });
  }

  async tapAccountSrpLink(): Promise<void> {
    await Gestures.waitAndTap(this.accountSrpLink, {
      elemDescription: 'View Account SRP in Account Details',
    });
  }
}

export default new AccountDetails();
