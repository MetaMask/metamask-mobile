import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { SuccessImportAccountIDs } from '../../../app/components/Views/ImportPrivateKeySuccess/SuccessImportAccount.testIds';
import WalletView from '../wallet/WalletView';
import {
  asDetoxElement,
  asPlaywrightElement,
  Utilities,
  EncapsulatedElementType,
  Assertions,
} from '../../framework';
import { PlatformDetector } from '../../framework/PlatformLocator';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import { getDriver } from '../../framework/PlaywrightUtilities';
import PlaywrightAssertions from '../../framework/PlaywrightAssertions';

class SuccessImportAccountView {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(SuccessImportAccountIDs.CONTAINER);
  }

  get closeButton(): EncapsulatedElementType {
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
    if (PlatformDetector.isIOS()) {
      await Gestures.waitAndTap(this.closeButton, {
        elemDescription: 'Close button',
        waitForElementToDisappear: true,
      });
      return;
    }

    await encapsulatedAction({
      detox: async () => {
        await device.pressBack();
      },
      appium: async () => {
        const drv = getDriver();
        if (!drv) {
          throw new Error('Driver is not available');
        }
        await drv.back();
        await Assertions.expectElementToNotBeVisible(this.closeButton, {
          description: 'Success Import Account modal',
          timeout: 15_000,
        });
      },
    });
  }
}

export default new SuccessImportAccountView();
