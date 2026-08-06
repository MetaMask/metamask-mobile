import {
  encapsulated,
  EncapsulatedElementType,
  asPlaywrightElement,
} from '../../framework/EncapsulatedElement';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import {
  ConfirmationFooterSelectorIDs,
  ConfirmationUIType,
} from '../../../app/components/Views/confirmations/ConfirmationView.testIds';
import { PlaywrightAssertions, sleep } from '../../framework';

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

  get modalContainer(): EncapsulatedElementType {
    return encapsulated({
      appium: () => PlaywrightMatchers.getElementById(ConfirmationUIType.MODAL),
    });
  }

  get flatContainer(): EncapsulatedElementType {
    return encapsulated({
      appium: () => PlaywrightMatchers.getElementById(ConfirmationUIType.FLAT),
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

  /**
   * True when a redesign confirmation (sign / typed-data / tx) is on screen.
   * `cancel-button` alone is shared with the connect sheet.
   */
  async isSignSheetVisible(): Promise<boolean> {
    for (const getter of [
      () => this.modalContainer,
      () => this.flatContainer,
      () => this.confirmButton,
    ]) {
      try {
        const element = await asPlaywrightElement(getter());
        // PlaywrightElement exposes isVisible() (maps to WDIO isDisplayed).
        if (await element.isVisible()) {
          return true;
        }
      } catch {
        // Selector not present; try next.
      }
    }
    return false;
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
        await PlaywrightAssertions.expectConditionWithRetry(async () => {
          const element = await asPlaywrightElement(this.confirmButton);
          await element.waitForDisplayed({
            timeout: 5000,
            timeoutMsg: 'SignModal: confirm button not visible',
          });
          await element.click();
        });
      },
    });
    if (shouldCooldown) {
      await sleep(timeToCooldown);
    }
  }

  async tapCancelButton({
    shouldCooldown = false,
    timeToCooldown = 1000,
    timeout = 15_000,
  }: {
    shouldCooldown?: boolean;
    timeToCooldown?: number;
    timeout?: number;
  } = {}): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        // Single poll up to `timeout` — do not wrap in expectConditionWithRetry
        // (that would multiply the budget by maxRetries).
        const sheetDeadline = Date.now() + timeout;
        while (Date.now() < sheetDeadline) {
          if (await this.isSignSheetVisible()) {
            break;
          }
          await sleep(250);
        }
        if (!(await this.isSignSheetVisible())) {
          throw new Error(
            `SignModal: confirmation sheet not visible within ${timeout}ms`,
          );
        }
        const element = await asPlaywrightElement(this.cancelButton);
        await element.waitForDisplayed({
          timeout: 5_000,
          timeoutMsg: 'SignModal: cancel button not visible',
        });
        await element.click();
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
