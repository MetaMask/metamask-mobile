import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { sleep, type EncapsulatedElementType } from '../../framework';
import { ConfirmationFooterSelectorIDs } from '../../../app/components/Views/confirmations/ConfirmationView.testIds';

class SignModal {
  get confirmButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ConfirmationFooterSelectorIDs.CONFIRM_BUTTON,
    );
  }

  get cancelButton(): EncapsulatedElementType {
    return Matchers.getElementByID(ConfirmationFooterSelectorIDs.CANCEL_BUTTON);
  }

  getNetworkText(network: string): EncapsulatedElementType {
    return Matchers.getElementByNativeXPath(
      `(//android.widget.TextView[@text="${network}"])[1]`,
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
      timeout: 5000,
      elemDescription: 'SignModal confirm button',
    });
    if (shouldCooldown) {
      await sleep(timeToCooldown);
    }
  }

  async tapCancelButton({
    shouldCooldown = false,
    timeToCooldown = 1000,
  }: {
    shouldCooldown?: boolean;
    timeToCooldown?: number;
  } = {}): Promise<void> {
    await Gestures.waitAndTap(this.cancelButton, {
      timeout: 5000,
      elemDescription: 'SignModal cancel button',
    });
    if (shouldCooldown) {
      await sleep(timeToCooldown);
    }
  }

  async assertNetworkText(network: string): Promise<void> {
    await Assertions.expectElementToBeVisible(this.getNetworkText(network), {
      timeout: 10000,
      description: `SignModal: network text "${network}" not visible`,
    });
  }
}

export default new SignModal();
