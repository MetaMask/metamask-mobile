import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../framework/Assertions';

class PerpsDepositView {
  // Custom deposit keypad container
  get keypad(): DetoxElement {
    return Matchers.getElementByID('deposit-keyboard');
  }

  // Continue button (toolbar text)
  get continueButtonByText(): DetoxElement {
    return Matchers.getElementByText('Continue');
  }

  // Confirm button on review screen
  get confirmButtonByText(): DetoxElement {
    return Matchers.getElementByText('Confirm');
  }

  // Pay with row (open selector)
  get payWithRow(): DetoxElement {
    return Matchers.getElementByText('Pay with');
  }

  get usdcOption(): DetoxElement {
    return Matchers.getElementByText('USDC');
  }

  async expectLoaded(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.keypad, {
      description: 'Deposit keyboard is visible',
      timeout: 15000,
    });
  }

  async selectUSDC(): Promise<void> {
    await Gestures.waitAndTap(this.payWithRow, {
      elemDescription: 'Open Pay with selector',
    });
    await Gestures.waitAndTap(this.usdcOption, {
      elemDescription: 'Select USDC in Pay with',
    });
  }

  async focusAmount(): Promise<void> {
    // Ensure the deposit keyboard is visible and interactable, then tap it to focus amount entry
    await Assertions.expectElementToBeVisible(this.keypad, {
      description: 'Deposit keyboard is visible before typing amount',
    });
    await Gestures.waitAndTap(this.keypad, {
      elemDescription: 'Focus amount via deposit keyboard container',
      checkEnabled: false,
      checkVisibility: false,
    });
  }

  async typeUSD(amount: string): Promise<void> {
    // Types digits using the on-screen keypad (buttons 0-9 and '.')
    for (const ch of amount) {
      const key = Matchers.getElementByText(ch) as DetoxElement;
      await Gestures.waitAndTap(key, {
        elemDescription: `Keypad ${ch}`,
        checkEnabled: false,
        checkVisibility: false,
      });
    }
  }

  async tapContinue(): Promise<void> {
    await Gestures.waitAndTap(this.continueButtonByText, {
      elemDescription: 'Continue (by text) deposit confirmation',
      checkEnabled: false,
      checkVisibility: false,
    });
  }

  async tapConfirm(): Promise<void> {
    await Gestures.waitAndTap(this.confirmButtonByText, {
      elemDescription: 'Confirm deposit',
    });
  }
}

export default new PerpsDepositView();
