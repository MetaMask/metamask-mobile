import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { sleep, type EncapsulatedElementType } from '../../framework';
import { TestSnapBottomSheetSelectorWebIDS } from '../../selectors/Browser/TestSnaps.selectors';
import { SolanaTestDappSelectorsWebIDs } from '../../selectors/Browser/SolanaTestDapp.selectors';

class SnapSignModal {
  get confirmButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      SolanaTestDappSelectorsWebIDs.CONFIRM_SIGN_MESSAGE_BUTTON,
    );
  }

  get cancelButton(): EncapsulatedElementType {
    return Matchers.getElementByNativeXPath(
      `//*[contains(@resource-id,"cancel") ` +
        `and contains(@resource-id,"${TestSnapBottomSheetSelectorWebIDS.SNAP_FOOTER_BUTTON_ID}")]`,
    );
  }

  async tapConfirmButton({
    timeout = 5000,
    shouldCooldown = false,
    timeToCooldown = 1000,
  }: {
    timeout?: number;
    shouldCooldown?: boolean;
    timeToCooldown?: number;
  } = {}): Promise<void> {
    await Gestures.waitAndTap(this.confirmButton, {
      timeout,
      elemDescription: 'SnapSignModal confirm button',
    });
    await sleep(1000); // Wait for the modal to close
    if (shouldCooldown) {
      await sleep(timeToCooldown);
    }
  }

  async tapCancelButton({
    timeout = 5000,
    shouldCooldown = false,
    timeToCooldown = 1000,
  }: {
    timeout?: number;
    shouldCooldown?: boolean;
    timeToCooldown?: number;
  } = {}): Promise<void> {
    await Gestures.waitAndTap(this.cancelButton, {
      timeout,
      elemDescription: 'SnapSignModal cancel button',
    });
    if (shouldCooldown) {
      await sleep(timeToCooldown);
    }
  }
}

export default new SnapSignModal();
