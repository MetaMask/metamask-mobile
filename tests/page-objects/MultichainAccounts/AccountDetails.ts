import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { AccountDetailsIds } from '../../../app/components/Views/MultichainAccounts/AccountDetails.testIds';
import { ExportCredentialsIds } from '../../../app/components/Views/MultichainAccounts/AccountDetails/ExportCredentials.testIds';
import { type AppiumElement, getDriver } from '../../framework';
import { PlatformDetector } from '../../framework/PlatformLocator';

class AccountDetails {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(AccountDetailsIds.ACCOUNT_DETAILS_CONTAINER);
  }

  get shareAddress(): Promise<AppiumElement> {
    return Matchers.getElementByID(AccountDetailsIds.ACCOUNT_ADDRESS_LINK);
  }

  get editAccountName(): Promise<AppiumElement> {
    return Matchers.getElementByID(AccountDetailsIds.ACCOUNT_NAME_LINK);
  }

  get editWalletName(): Promise<AppiumElement> {
    return Matchers.getElementByID(AccountDetailsIds.WALLET_NAME_LINK);
  }

  get networksLink(): Promise<AppiumElement> {
    return Matchers.getElementByID(AccountDetailsIds.NETWORKS_LINK);
  }

  get backButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(AccountDetailsIds.BACK_BUTTON);
  }

  get deleteAccountLink(): Promise<AppiumElement> {
    return Matchers.getElementByID(AccountDetailsIds.REMOVE_ACCOUNT_BUTTON);
  }

  get accountSrpLink(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      AccountDetailsIds.SECRET_RECOVERY_PHRASE_LINK,
    );
  }

  get exportPrivateKeyButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ExportCredentialsIds.EXPORT_PRIVATE_KEY_BUTTON,
    );
  }

  get privateKeysLink(): Promise<AppiumElement> {
    return Matchers.getElementByID(AccountDetailsIds.PRIVATE_KEYS_LINK);
  }

  get exportSrpButton(): Promise<AppiumElement> {
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

  /**
   * Appium iOS: XCTest often reports `isDisplayed() === false` on native-stack
   * screens even when page source shows `visible="true"`. Skip displayed checks
   * and tap by testID directly (same pattern as AddressList.tapBackButton).
   */
  async tapBackButton(): Promise<void> {
    if (PlatformDetector.isIOS()) {
      try {
        await Gestures.waitAndTap(this.backButton, {
          timeout: 10_000,
          checkForDisplayed: false,
          elemDescription: 'Back Button in Account Details',
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
