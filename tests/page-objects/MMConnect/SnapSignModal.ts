import {
  encapsulated,
  EncapsulatedElementType,
  asPlaywrightElement,
} from '../../framework/EncapsulatedElement';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import { TestSnapBottomSheetSelectorWebIDS } from '../../selectors/Browser/TestSnaps.selectors';
import {
  PlaywrightAssertions,
  PlaywrightElement,
  PlaywrightGestures,
  sleep,
} from '../../framework';
import { SolanaTestDappSelectorsWebIDs } from '../../selectors/Browser/SolanaTestDapp.selectors';

class SnapSignModal {
  get confirmButton(): EncapsulatedElementType {
    return encapsulated({
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            SolanaTestDappSelectorsWebIDs.CONFIRM_SIGN_MESSAGE_BUTTON,
            { exact: true },
          ),
      },
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

  async tapConfirmButton({
    timeout = 5000,
    shouldCooldown = false,
    timeToCooldown = 1000,
  }: {
    timeout?: number;
    shouldCooldown?: boolean;
    timeToCooldown?: number;
  } = {}): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        let element: PlaywrightElement | undefined;
        await PlaywrightAssertions.expectConditionWithRetry(async () => {
          element = await asPlaywrightElement(this.confirmButton);
          await element.waitForDisplayed({
            timeout,
            timeoutMsg: 'SnapSignModal: confirm button not visible',
          });
          await PlaywrightGestures.waitAndTap(element);
        });
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for the modal to close
      },
    });
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
    if (shouldCooldown) {
      await sleep(timeToCooldown);
    }
  }
}

export default new SnapSignModal();
