import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { sleep, type AppiumElement } from '../../framework';

class AddChainModal {
  get confirmButton(): Promise<AppiumElement> {
    return Matchers.getElementByID('approve-network-approve-button');
  }

  getText(value: string): Promise<AppiumElement> {
    return Matchers.getElementByNativeXPath(
      `//android.widget.TextView[@text="${value}"]`,
    );
  }

  async tapConfirmButton({
    shouldCooldown = false,
    timeToCooldown = 1000,
  }: {
    shouldCooldown?: boolean;
    timeToCooldown?: number;
  } = {}): Promise<void> {
    await Gestures.waitAndTap(this.confirmButton, {
      elemDescription: 'AddChainModal confirm button',
    });
    if (shouldCooldown) {
      await sleep(timeToCooldown);
    }
  }

  async assertText(value: string): Promise<void> {
    await Assertions.expectElementToBeVisible(this.getText(value), {
      timeout: 10000,
      description: `AddChainModal: text "${value}" not visible`,
    });
  }
}

export default new AddChainModal();
