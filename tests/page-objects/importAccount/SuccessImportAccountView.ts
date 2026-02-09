import Matchers from '../../framework/Matchers.ts';
import Gestures from '../../framework/Gestures.ts';
import { SuccessImportAccountIDs } from '../../../app/components/Views/ImportPrivateKeySuccess/SuccessImportAccount.testIds.ts';
import WalletView from '../wallet/WalletView.ts';
import { Utilities } from '../../framework';

class SuccessImportAccountView {
  get container(): DetoxElement {
    return Matchers.getElementByID(SuccessImportAccountIDs.CONTAINER);
  }

  get closeButton(): DetoxElement {
    return Matchers.getElementByID(SuccessImportAccountIDs.CLOSE_BUTTON);
  }

  /**
   * Closes the success import account modal.
   *
   * On iOS, taps the close button and waits for the modal to disappear.
   * On Android, uses device back button and tap as a workaround since
   * the close button doesn't properly dismiss the modal.
   *
   * @returns A promise that resolves when the modal is closed
   */
  async tapCloseButton(): Promise<void> {
    if (device.getPlatform() === 'ios') {
      await Gestures.waitAndTap(this.closeButton, {
        elemDescription: 'Close button',
        waitForElementToDisappear: true,
      });
      return;
    }
    // On Android, tapping the close button does not close the modal
    // Workaround to dismiss the success modal
    await device.pressBack();
    await device.tap();
    await Utilities.waitForElementToBeVisible(WalletView.container); // Ensure we are back to Wallet view
    await WalletView.tapIdenticon();
  }
}

export default new SuccessImportAccountView();
