import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { AccountDetailsIds } from '../../../app/components/Views/MultichainAccounts/AccountDetails.testIds';
import { ExportCredentialsIds } from '../../../app/components/Views/MultichainAccounts/AccountDetails/ExportCredentials.testIds';
import { EncapsulatedElementType, asPlaywrightElement } from '../../framework';
import { FrameworkDetector } from '../../framework/FrameworkDetector';
import { PlatformDetector } from '../../framework/PlatformLocator';
import { getDriver } from '../../framework/PlaywrightUtilities';
import PlaywrightGestures from '../../framework/PlaywrightGestures';

class AccountDetails {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(AccountDetailsIds.ACCOUNT_DETAILS_CONTAINER);
  }

  get shareAddress(): EncapsulatedElementType {
    return Matchers.getElementByID(AccountDetailsIds.ACCOUNT_ADDRESS_LINK);
  }

  get editAccountName(): EncapsulatedElementType {
    return Matchers.getElementByID(AccountDetailsIds.ACCOUNT_NAME_LINK);
  }

  get editWalletName(): EncapsulatedElementType {
    return Matchers.getElementByID(AccountDetailsIds.WALLET_NAME_LINK);
  }

  get networksLink(): EncapsulatedElementType {
    return Matchers.getElementByID(AccountDetailsIds.NETWORKS_LINK);
  }

  get backButton(): EncapsulatedElementType {
    return Matchers.getElementByID(AccountDetailsIds.BACK_BUTTON);
  }

  get deleteAccountLink(): EncapsulatedElementType {
    return Matchers.getElementByID(AccountDetailsIds.REMOVE_ACCOUNT_BUTTON);
  }

  get accountSrpLink(): EncapsulatedElementType {
    return Matchers.getElementByID(
      AccountDetailsIds.SECRET_RECOVERY_PHRASE_LINK,
    );
  }

  get exportPrivateKeyButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ExportCredentialsIds.EXPORT_PRIVATE_KEY_BUTTON,
    );
  }

  get privateKeysLink(): EncapsulatedElementType {
    return Matchers.getElementByID(AccountDetailsIds.PRIVATE_KEYS_LINK);
  }

  get exportSrpButton(): EncapsulatedElementType {
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
    if (FrameworkDetector.isAppium() && PlatformDetector.isIOS()) {
      const container = await asPlaywrightElement(this.container);
      const isOnAccountDetails = await container.isVisible().catch(() => false);
      if (!isOnAccountDetails) {
        return;
      }

      const backEl = await asPlaywrightElement(this.backButton);
      try {
        await PlaywrightGestures.waitAndTap(backEl, {
          timeout: 5_000,
          checkForDisplayed: false,
        });
      } catch {
        const drv = getDriver();
        if (!drv) {
          throw new Error('Driver is not available');
        }
        await drv.back();
      }
      return;
    }

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
