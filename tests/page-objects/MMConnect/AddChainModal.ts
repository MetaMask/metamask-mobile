import {
  encapsulated,
  EncapsulatedElementType,
  asPlaywrightElement,
} from '../../framework/EncapsulatedElement';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';
import PlaywrightAssertions from '../../framework/PlaywrightAssertions';
import { sleep } from '../../framework';

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

  async tapConfirmButton({
    shouldCooldown = false,
    timeToCooldown = 1000,
  }: {
    shouldCooldown?: boolean;
    timeToCooldown?: number;
  } = {}): Promise<void> {
    await UnifiedGestures.waitAndTap(this.confirmButton);
    if (shouldCooldown) {
      await sleep(timeToCooldown);
    }
  }

  async assertText(value: string): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        await PlaywrightAssertions.expectConditionWithRetry(async () => {
          const element = await asPlaywrightElement(this.getText(value));
          await element.waitForDisplayed({
            timeout: 10000,
            timeoutMsg: `AddChainModal: text "${value}" not visible`,
          });
        });
      },
    });
  }
}

export default new AddChainModal();
