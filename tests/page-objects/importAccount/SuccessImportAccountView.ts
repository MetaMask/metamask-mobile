import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { SuccessImportAccountIDs } from '../../../app/components/Views/ImportPrivateKeySuccess/SuccessImportAccount.testIds';
import WalletView from '../wallet/WalletView';
import {
  asDetoxElement,
  asPlaywrightElement,
  Utilities,
  EncapsulatedElementType,
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
        await device.tap();
        await Utilities.waitForElementToBeVisible(
          asDetoxElement(WalletView.container),
        );
        await WalletView.tapIdenticon();
      },
      appium: async () => {
        const driver = getDriver();
        if (!driver) {
          throw new Error('Driver is not available');
        }
        await driver.back();
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(WalletView.container),
          {
            description: 'Wallet screen',
            timeout: 15_000,
          },
        );
        await WalletView.tapIdenticon();
      },
    });
  }
}

export default new SuccessImportAccountView();
