import {
  encapsulated,
  EncapsulatedElementType,
  asPlaywrightElement,
} from '../../framework/EncapsulatedElement';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import { ConfirmationFooterSelectorIDs } from '../../../app/components/Views/confirmations/ConfirmationView.testIds';
import { PlaywrightAssertions, PlaywrightElement } from '../../framework';

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

  async tapConfirmButton(): Promise<void> {
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
  }

  async tapCancelButton(): Promise<void> {
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
  }

  async assertNetworkText(network: string): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        // We're making 5 retries as the confirmation screen can take a
        const maxRetries = 5;

        for (let i = 0; i < maxRetries; i++) {
          try {
            const element = await asPlaywrightElement(
              this.getNetworkText(network),
            );
            await element.waitForDisplayed({
              timeoutMsg: `SignModal: network text "${network}" not visible`,
            });
            return;
          } catch (error) {
            console.log(
              `SignModal: network text "${network}" not visible on attempt ${i + 1}`,
            );
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
        throw new Error(
          `SignModal: network text "${network}" not visible after ${maxRetries} attempts`,
        );
      },
    });
  }
}

export default new SignModal();
