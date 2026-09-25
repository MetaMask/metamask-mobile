import { RemoveAccountSelectors } from '../../../app/components/Views/ManageAccounts/sheets/RemoveAccount/RemoveAccount.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { type AppiumElement } from '../../framework';

/**
 * Page object for the remove-account confirmation bottom sheet opened from
 * the Manage Accounts screen (`ManageAccounts.tapRemoveButton` on an
 * imported private-key group). Confirming dismisses the sheet (back to
 * Manage Accounts) and removes the account asynchronously.
 */
class RemoveAccount {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(RemoveAccountSelectors.CONTAINER);
  }

  get warning(): Promise<AppiumElement> {
    return Matchers.getElementByID(RemoveAccountSelectors.WARNING);
  }

  get removeButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(RemoveAccountSelectors.REMOVE_BUTTON);
  }

  async tapRemoveButton(): Promise<void> {
    await Gestures.waitAndTap(this.removeButton, {
      elemDescription: 'Remove Button in Remove Account sheet',
      checkForDisplayed: true,
      waitForInteractive: true,
    });
  }
}

export default new RemoveAccount();
