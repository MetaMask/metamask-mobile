import { StakeViewSelectors } from '../../selectors/Stake/StakeView.selectors.js';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Utilities from '../../framework/Utilities';
import {
  EncapsulatedElementType,
  encapsulatedAction,
  PlatformDetector,
} from '../../framework';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import PlaywrightGestures from '../../framework/PlaywrightGestures';
import PlaywrightAssertions from '../../framework/PlaywrightAssertions';

class StakeView {
  get stakeContainer(): EncapsulatedElementType {
    return Matchers.getElementByText(StakeViewSelectors.STAKE_CONTAINER);
  }

  get unstakeContainer(): EncapsulatedElementType {
    return Matchers.getElementByText(StakeViewSelectors.UNSTAKE_CONTAINER);
  }

  get reviewButton(): EncapsulatedElementType {
    return Matchers.getElementByText(StakeViewSelectors.REVIEW_BUTTON);
  }

  get confirmButton(): EncapsulatedElementType {
    return Matchers.getElementByText(StakeViewSelectors.CONFIRM);
  }

  async selectAmount(amount: string): Promise<void> {
    const amountButton = Matchers.getElementByText(amount);
    await Gestures.waitAndTap(amountButton);
  }

  async enterAmount(amount: string): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        for (const digit of amount) {
          const button = Matchers.getElementByText(digit);
          await Gestures.waitAndTap(button, {
            elemDescription: `Digit ${digit} in Stake Amount`,
          });
        }
      },
      appium: async () => {
        // Text match for "1"/"0" hits balances on Android; use keypad testIDs.
        const isAndroid = PlatformDetector.isAndroid();
        for (const digit of amount.split('')) {
          const keyName =
            digit === '.' ? 'keypad-key-dot' : `keypad-key-${digit}`;
          const el = isAndroid
            ? await PlaywrightMatchers.getElementById(keyName, {
                exact: true,
              })
            : await PlaywrightMatchers.getElementByXPath(
                `//*[contains(@name,'${keyName}')]`,
              );
          await PlaywrightAssertions.expectElementToBeVisible(el, {
            timeout: 10000,
            description: `Keypad digit ${digit} should be visible`,
          });
          await PlaywrightGestures.waitAndTap(el, {
            checkForDisplayed: true,
            checkForEnabled: true,
            delay: 500,
          });
        }
      },
    });
  }

  async tapReview(timeout?: number): Promise<void> {
    await Gestures.waitAndTap(this.reviewButton, {
      timeout,
      elemDescription: 'Review Button in Stake View',
    });
  }

  async tapReviewWithRetry(timeout = 90000): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        // Only tap review if we haven't already navigated to the confirm screen
        const onConfirmScreen = await Utilities.isElementVisible(
          this.confirmButton,
          2000,
        );
        if (!onConfirmScreen) {
          await Gestures.waitAndTap(this.reviewButton, {
            timeout: 5000,
            elemDescription: 'Review Button in Stake View',
          });
        }
        await Utilities.waitForElementToBeEnabled(this.confirmButton, 5000);
      },
      {
        timeout,
        description: 'Tap Review and wait for Confirm screen',
        elemDescription: 'Review → Confirm flow in Stake View',
      },
    );
  }

  async tapConfirm(timeout?: number): Promise<void> {
    await Gestures.waitAndTap(this.confirmButton, {
      timeout,
      elemDescription: 'Confirm Button in Stake View',
    });
  }
}

export default new StakeView();
