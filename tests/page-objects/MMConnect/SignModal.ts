import {
  encapsulated,
  EncapsulatedElementType,
  asPlaywrightElement,
} from '../../framework/EncapsulatedElement';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import { ConfirmationFooterSelectorIDs } from '../../../app/components/Views/confirmations/ConfirmationView.testIds';
import {
  PlaywrightAssertions,
  PlaywrightElement,
  sleep,
} from '../../framework';

class SignModal {
  get confirmButton(): EncapsulatedElementType {
    return encapsulated({
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConfirmationFooterSelectorIDs.CONFIRM_BUTTON,
        ),
    });
  }

  get cancelButton(): EncapsulatedElementType {
    return encapsulated({
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConfirmationFooterSelectorIDs.CANCEL_BUTTON,
        ),
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

  async tapConfirmButton({
    shouldCooldown = false,
    timeToCooldown = 1000,
  }: {
    shouldCooldown?: boolean;
    timeToCooldown?: number;
  } = {}): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        let element: PlaywrightElement | undefined;
        await PlaywrightAssertions.expectConditionWithRetry(async () => {
          element = await asPlaywrightElement(this.confirmButton);
          await element.waitForDisplayed({
            timeout: 5000,
            timeoutMsg: 'SignModal: confirm button not visible',
          });
        });
        await element?.click();
      },
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
    await encapsulatedAction({
      appium: async () => {
        let element: PlaywrightElement | undefined;
        await PlaywrightAssertions.expectConditionWithRetry(async () => {
          element = await asPlaywrightElement(this.cancelButton);
          await element.waitForDisplayed({
            timeout: 5000,
            timeoutMsg: 'SignModal: cancel button not visible',
          });
        });
        await element?.click();
      },
    });
    if (shouldCooldown) {
      await sleep(timeToCooldown);
    }
  }

  async assertNetworkText(network: string): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        await PlaywrightAssertions.expectConditionWithRetry(
          async () => {
            const element = await asPlaywrightElement(
              this.getNetworkText(network),
            );
            await element.waitForDisplayed({
              timeout: 10000,
              timeoutMsg: `SignModal: network text "${network}" not visible`,
            });
          },
          {
            maxRetries: 5,
            interval: 1000,
          },
        );
      },
    });
  }
}

export default new SignModal();
