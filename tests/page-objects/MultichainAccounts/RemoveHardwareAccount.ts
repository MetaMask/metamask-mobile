import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { RemoveHardwareAccountSelectors } from '../../../app/components/Views/ManageAccounts/sheets/RemoveHardwareAccount/RemoveHardwareAccount.testIds';
import { type AppiumElement } from '../../framework';

/**
 * Page object for the remove-hardware-account confirmation bottom sheet
 * opened from the Manage Accounts screen (`ManageAccounts.tapRemoveButton`
 * on a hardware wallet group). Confirming dismisses the sheet (back to
 * Manage Accounts) and removes the hardware account asynchronously.
 */
class RemoveHardwareAccount {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(RemoveHardwareAccountSelectors.CONTAINER);
  }

  get warning(): Promise<AppiumElement> {
    return Matchers.getElementByID(RemoveHardwareAccountSelectors.WARNING);
  }

  get removeButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      RemoveHardwareAccountSelectors.REMOVE_BUTTON,
    );
  }

  async tapRemoveButton(): Promise<void> {
    await Gestures.waitAndTap(this.removeButton, {
      elemDescription: 'Remove Button in Remove Hardware Account sheet',
    });
  }
}

export default new RemoveHardwareAccount();
