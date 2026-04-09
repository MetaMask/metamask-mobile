import {
  encapsulated,
  EncapsulatedElementType,
  asPlaywrightElement,
} from '../../framework/EncapsulatedElement';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class AddChainModal {
  get confirmButton(): EncapsulatedElementType {
    return encapsulated({
      appium: () =>
        PlaywrightMatchers.getElementById('approve-network-approve-button'),
    });
  }

  getText(value: string): EncapsulatedElementType {
    return encapsulated({
      appium: () =>
        PlaywrightMatchers.getElementByXPath(
          `//android.widget.TextView[@text="${value}"]`,
        ),
    });
  }

  async tapConfirmButton(): Promise<void> {
    await UnifiedGestures.tap(this.confirmButton);
  }

  async assertText(value: string): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const element = await asPlaywrightElement(this.getText(value));
        await element.waitForDisplayed({
          timeoutMsg: `AddChainModal: text "${value}" not visible`,
        });
      },
    });
  }
}

export default new AddChainModal();
