import Matchers from '../../framework/Matchers';
import { AccountDetailsIds } from '../../../app/components/Views/MultichainAccounts/AccountDetails.testIds';
import { ExportCredentialsIds } from '../../../app/components/Views/MultichainAccounts/AccountDetails/ExportCredentials.testIds';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class AccountDetails {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(AccountDetailsIds.ACCOUNT_DETAILS_CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AccountDetailsIds.ACCOUNT_DETAILS_CONTAINER,
        ),
    });
  }

  get shareAddress(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(AccountDetailsIds.ACCOUNT_ADDRESS_LINK),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AccountDetailsIds.ACCOUNT_ADDRESS_LINK,
        ),
    });
  }

  get editAccountName(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(AccountDetailsIds.ACCOUNT_NAME_LINK),
      appium: () =>
        PlaywrightMatchers.getElementById(AccountDetailsIds.ACCOUNT_NAME_LINK),
    });
  }

  get editWalletName(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(AccountDetailsIds.WALLET_NAME_LINK),
      appium: () =>
        PlaywrightMatchers.getElementById(AccountDetailsIds.WALLET_NAME_LINK),
    });
  }

  get networksLink(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(AccountDetailsIds.NETWORKS_LINK),
      appium: () =>
        PlaywrightMatchers.getElementById(AccountDetailsIds.NETWORKS_LINK),
    });
  }

  get backButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(AccountDetailsIds.BACK_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(AccountDetailsIds.BACK_BUTTON),
    });
  }

  get deleteAccountLink(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(AccountDetailsIds.REMOVE_ACCOUNT_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AccountDetailsIds.REMOVE_ACCOUNT_BUTTON,
        ),
    });
  }

  get accountSrpLink(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(AccountDetailsIds.SECRET_RECOVERY_PHRASE_LINK),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AccountDetailsIds.SECRET_RECOVERY_PHRASE_LINK,
        ),
    });
  }

  get exportPrivateKeyButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ExportCredentialsIds.EXPORT_PRIVATE_KEY_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ExportCredentialsIds.EXPORT_PRIVATE_KEY_BUTTON,
        ),
    });
  }

  get privateKeysLink(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(AccountDetailsIds.PRIVATE_KEYS_LINK),
      appium: () =>
        PlaywrightMatchers.getElementById(AccountDetailsIds.PRIVATE_KEYS_LINK),
    });
  }

  get exportSrpButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ExportCredentialsIds.EXPORT_SRP_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ExportCredentialsIds.EXPORT_SRP_BUTTON,
        ),
    });
  }

  async tapShareAddress(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.shareAddress, {
      elemDescription: 'Share Address Link in Account Details',
    });
  }

  async tapEditAccountName(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.editAccountName, {
      elemDescription: 'Edit Account Name Link in Account Details',
    });
  }

  async tapEditWalletName(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.editWalletName, {
      elemDescription: 'Edit Wallet Name Link in Account Details',
    });
  }

  async tapBackButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.backButton, {
      elemDescription: 'Back Button in Account Details',
    });
  }

  async tapDeleteAccountLink(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.deleteAccountLink, {
      elemDescription: 'Delete Account Link in Account Details',
    });
  }

  async tapNetworksLink(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.networksLink, {
      elemDescription: 'Networks Link in Account Details',
    });
  }

  async tapPrivateKeyLink(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.privateKeysLink, {
      elemDescription: 'Unlock to reveal Private Keys in Account Details',
    });
  }

  async tapExportPrivateKeyButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.exportPrivateKeyButton, {
      elemDescription: 'Export Private Key Button in Account Details',
    });
  }

  async tapExportSrpButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.exportSrpButton, {
      elemDescription: 'Export SRP Button in Account Details',
    });
  }

  async tapAccountSrpLink(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.accountSrpLink, {
      elemDescription: 'View Account SRP in Account Details',
    });
  }
}

export default new AccountDetails();
