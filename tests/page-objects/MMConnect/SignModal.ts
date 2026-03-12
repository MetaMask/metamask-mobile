import {
  encapsulated,
  EncapsulatedElementType,
  asPlaywrightElement,
} from '../../framework/EncapsulatedElement';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class SignModal {
  get confirmButton(): EncapsulatedElementType {
    return encapsulated({
      appium: () => PlaywrightMatchers.getElementById('confirm-button'),
    });
  }

  get cancelButton(): EncapsulatedElementType {
    return encapsulated({
      appium: () => PlaywrightMatchers.getElementById('cancel-button'),
    });
  }

  getNetworkText(network: string): EncapsulatedElementType {
    return encapsulated({
      appium: () =>
        PlaywrightMatchers.getElementByXPath(
          `(//android.widget.TextView[@text="${network}"])[1]`,
        ),
    });
  }

  async tapConfirmButton(): Promise<void> {
    await UnifiedGestures.tap(this.confirmButton);
  }

  async tapCancelButton(): Promise<void> {
    await UnifiedGestures.tap(this.cancelButton);
  }

  async assertNetworkText(network: string): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const element = await asPlaywrightElement(this.getNetworkText(network));
        await element.waitForDisplayed({
          timeoutMsg: `SignModal: network text "${network}" not visible`,
        });
      },
    });
  }
}

export default new SignModal();
