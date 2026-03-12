import {
  encapsulated,
  EncapsulatedElementType,
  asPlaywrightElement,
} from '../../framework/EncapsulatedElement';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';

class SnapSignModal {
  get confirmButton(): EncapsulatedElementType {
    return encapsulated({
      appium: () =>
        PlaywrightMatchers.getElementByXPath(
          '//*[contains(@resource-id,"snap-footer-button") ' +
            'and not(contains(@resource-id,"cancel")) ' +
            'and not(contains(@resource-id,"default-snap-footer-button"))]',
        ),
    });
  }

  get cancelButton(): EncapsulatedElementType {
    return encapsulated({
      appium: () =>
        PlaywrightMatchers.getElementByXPath(
          '//*[contains(@resource-id,"cancel") ' +
            'and contains(@resource-id,"snap-footer-button")]',
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
