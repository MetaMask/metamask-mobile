import { RemoveWalletSelectors } from '../../../app/components/Views/ManageAccounts/sheets/RemoveWallet/RemoveWallet.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { type AppiumElement } from '../../framework';

class RemoveWallet {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(RemoveWalletSelectors.CONTAINER);
  }

  get warning(): Promise<AppiumElement> {
    return Matchers.getElementByID(RemoveWalletSelectors.WARNING);
  }

  /** SRP back-up banner — rendered only when the wallet is not backed up. */
  get backupBanner(): Promise<AppiumElement> {
    return Matchers.getElementByID(RemoveWalletSelectors.BACKUP_BANNER);
  }

  get removeButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(RemoveWalletSelectors.REMOVE_BUTTON);
  }

  get cancelButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(RemoveWalletSelectors.CANCEL_BUTTON);
  }

  async tapRemoveButton(): Promise<void> {
    await Gestures.waitAndTap(this.removeButton, {
      elemDescription: 'Remove wallet confirm button',
      checkForDisplayed: true,
      waitForInteractive: true,
    });
  }

  async tapCancelButton(): Promise<void> {
    await Gestures.waitAndTap(this.cancelButton, {
      elemDescription: 'Remove wallet cancel button',
      checkForDisplayed: true,
      waitForInteractive: true,
    });
  }
}

export default new RemoveWallet();
