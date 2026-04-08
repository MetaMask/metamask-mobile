import {
  encapsulated,
  EncapsulatedElementType,
  asPlaywrightElement,
} from '../../framework/EncapsulatedElement';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import { TestSnapBottomSheetSelectorWebIDS } from '../../selectors/Browser/TestSnaps.selectors';

class SnapSignModal {
  get confirmButton(): EncapsulatedElementType {
    return encapsulated({
      appium: () =>
        PlaywrightMatchers.getElementByXPath(
          `//*[contains(@resource-id,"${TestSnapBottomSheetSelectorWebIDS.SNAP_FOOTER_BUTTON_ID}") ` +
            'and not(contains(@resource-id,"cancel")) ' +
            `and not(contains(@resource-id,"${TestSnapBottomSheetSelectorWebIDS.DEFAULT_FOOTER_BUTTON_ID}"))]`,
        ),
    });
  }

  get cancelButton(): EncapsulatedElementType {
    return encapsulated({
      appium: () =>
        PlaywrightMatchers.getElementByXPath(
          `//*[contains(@resource-id,"cancel") ` +
            `and contains(@resource-id,"${TestSnapBottomSheetSelectorWebIDS.SNAP_FOOTER_BUTTON_ID}")]`,
        ),
    });
  }

  async tapConfirmButton({ timeout = 5000 } = {}): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const element = await asPlaywrightElement(this.confirmButton);
        await element.waitForDisplayed({
          timeout,
          timeoutMsg: 'SnapSignModal: confirm button not visible',
        });
        await element.click();
      },
    });
  }

  async tapCancelButton({ timeout = 5000 } = {}): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const element = await asPlaywrightElement(this.cancelButton);
        await element.waitForDisplayed({
          timeout,
          timeoutMsg: 'SnapSignModal: cancel button not visible',
        });
        await element.click();
      },
    });
  }
}

export default new SnapSignModal();
