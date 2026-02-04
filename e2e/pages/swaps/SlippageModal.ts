import Matchers from '../../../tests/framework/Matchers';
import Gestures from '../../../tests/framework/Gestures';
import Assertions from '../../../tests/framework/Assertions';
import {
  SlippageModalSelectorIDs,
  SlippageModalSelectorText,
} from '../../selectors/Bridge/SlippageModal.selectors';

class SlippageModal {
  get editSlippageButton(): DetoxElement {
    return Matchers.getElementByID(
      SlippageModalSelectorIDs.EDIT_SLIPPAGE_BUTTON,
    );
  }

  get customButton(): DetoxElement {
    return Matchers.getElementByText(SlippageModalSelectorText.CUSTOM);
  }

  get confirmButton(): DetoxElement {
    return Matchers.getElementByText(SlippageModalSelectorText.CONFIRM);
  }

  get submitButton(): DetoxElement {
    return Matchers.getElementByText(SlippageModalSelectorText.SUBMIT);
  }

  get inputStepperInput(): DetoxElement {
    return Matchers.getElementByID(
      SlippageModalSelectorIDs.INPUT_STEPPER_INPUT,
    );
  }

  get keypadDeleteButton(): DetoxElement {
    return Matchers.getElementByID(
      SlippageModalSelectorIDs.KEYPAD_DELETE_BUTTON,
    );
  }

  /**
   * Opens the slippage modal by tapping the edit slippage button
   */
  async openSlippageModal(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.editSlippageButton, {
      timeout: 30000,
      description: 'Edit slippage button should be visible',
    });
    await Gestures.waitAndTap(this.editSlippageButton, {
      elemDescription: 'Tap edit slippage button',
    });
  }

  /**
   * Taps the custom slippage option to open the custom slippage modal
   */
  async tapCustomOption(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.customButton, {
      description: 'Custom slippage option should be visible',
    });
    await Gestures.waitAndTap(this.customButton, {
      elemDescription: 'Tap custom slippage option',
    });
  }

  /**
   * Enters a custom slippage value using the keypad
   * @param value - The slippage value to enter (e.g., "2.5" for 2.5%)
   */
  async enterCustomSlippage(value: string): Promise<void> {
    // Wait for the custom slippage modal to be visible
    await Assertions.expectElementToBeVisible(this.inputStepperInput, {
      description: 'Custom slippage input should be visible',
    });

    // Clear the existing value first by long pressing delete
    await Gestures.longPress(this.keypadDeleteButton, {
      duration: 1000,
      elemDescription: 'Long press delete to clear slippage input',
    });

    // Enter each character of the value using the keypad
    for (const char of value) {
      const button = Matchers.getElementByText(char);
      await Gestures.waitAndTap(button, {
        elemDescription: `Tap keypad button ${char}`,
      });
    }
  }

  /**
   * Confirms the custom slippage selection
   */
  async confirmCustomSlippage(): Promise<void> {
    await Gestures.waitAndTap(this.confirmButton, {
      elemDescription: 'Confirm custom slippage',
    });
  }

  /**
   * Sets a custom slippage value end-to-end
   * @param value - The slippage value to set (e.g., "2.5" for 2.5%)
   */
  async setCustomSlippage(value: string): Promise<void> {
    await this.openSlippageModal();
    await this.tapCustomOption();
    await this.enterCustomSlippage(value);
    await this.confirmCustomSlippage();
  }
}

export default new SlippageModal();
