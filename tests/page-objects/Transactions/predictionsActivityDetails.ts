import { PredictActivityDetailsSelectorsIDs } from '../../../app/components/UI/Predict/Predict.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../framework/Assertions';
import { EncapsulatedElementType } from '../../framework';
import { PlatformDetector } from '../../framework/PlatformLocator';
import { resolveE2EWaitTimeoutMs } from '../../framework/Constants';

class PredictActivityDetails {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(
      PredictActivityDetailsSelectorsIDs.CONTAINER,
    );
  }

  get backButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      PredictActivityDetailsSelectorsIDs.BACK_BUTTON,
    );
  }

  get amountDisplay(): EncapsulatedElementType {
    return Matchers.getElementByID(
      PredictActivityDetailsSelectorsIDs.AMOUNT_DISPLAY,
    );
  }

  /**
   * iOS native-stack v7 often groups the heading amount with the USDC icon
   * (or marks the leaf StaticText accessible=false), so exact-text
   * `expectTextDisplayed('$30.75')` misses a visible details screen.
   * Stay scoped to the details container so a list row underneath cannot match.
   */
  amountElement(amount: string): EncapsulatedElementType {
    if (!PlatformDetector.isIOSAppium()) {
      return this.amountDisplay;
    }

    const container = PredictActivityDetailsSelectorsIDs.CONTAINER;
    const id = PredictActivityDetailsSelectorsIDs.AMOUNT_DISPLAY;
    const escaped = amount.replace(/"/g, '\\"');
    return Matchers.getElementByNativeXPath(
      [
        `//*[@name="${container}"]//*[@name="${id}"]`,
        `//*[@name="${container}"]//*[@accessible="true" and contains(@label,"${escaped}")]`,
        `//*[@name="${container}"]//*[contains(@value,"${escaped}")]`,
      ].join(' | '),
    );
  }

  async tapBackButton(): Promise<void> {
    await Gestures.waitAndTap(this.backButton);
  }

  async expectAmountDisplayed(amount: string): Promise<void> {
    await Assertions.expectElementToBeVisible(this.container, {
      description: 'Predict activity details',
    });

    const timeout = resolveE2EWaitTimeoutMs(15_000);
    const description = `Activity details amount ${amount}`;

    if (PlatformDetector.isIOSAppium()) {
      await Assertions.expectElementToExist(this.amountElement(amount), {
        timeout,
        description,
      });
      return;
    }

    await Assertions.expectElementToBeVisible(this.amountDisplay, {
      timeout,
      description,
    });
    await Assertions.expectElementToHaveText(this.amountDisplay, amount, {
      timeout,
      description,
    });
  }
}

export default new PredictActivityDetails();
