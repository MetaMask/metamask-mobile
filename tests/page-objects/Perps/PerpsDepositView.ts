import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../framework/Assertions';
import { EncapsulatedElementType, PlatformDetector } from '../../framework';

const TIMEOUT = {
  KEYPAD_DIGIT: 10000,
} as const;

class PerpsDepositView {
  // Custom deposit keypad container
  get keypad(): EncapsulatedElementType {
    return Matchers.getElementByID('deposit-keyboard');
  }

  /** Amount input - wdio PerpsDepositScreen uses 'custom-amount-input' for isAmountInputVisible */
  get amountInput(): EncapsulatedElementType {
    return Matchers.getElementByID('custom-amount-input');
  }

  /** Add funds button - wdio uses getElementByText('Add funds') for isAddFundsVisible */
  get addFundsButton(): EncapsulatedElementType {
    return Matchers.getElementByText('Add funds');
  }

  /** Total text - wdio uses getElementByText('Total') for isTotalVisible */
  get totalText(): EncapsulatedElementType {
    return Matchers.getElementByText('Total');
  }

  // Continue button (toolbar text)
  get continueButtonByText(): EncapsulatedElementType {
    return Matchers.getElementByText('Continue');
  }

  // Add funds (confirm) button on review screen. Uses testID for reliability:
  // the confirmation screen shows at most one "Add funds" (ConfirmButton);
  // index 1 was failing when no second "Add funds" existed in the hierarchy.
  get confirmButton(): EncapsulatedElementType {
    return Matchers.getElementByID('confirm-button');
  }

  get infoRow(): EncapsulatedElementType {
    return Matchers.getElementByID('info-row');
  }

  // Pay with row (open selector)
  get payWithRow(): EncapsulatedElementType {
    return Matchers.getElementByID('pay-with');
  }

  get usdcOption(): EncapsulatedElementType {
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
    const isAndroid = PlatformDetector.isAndroid();
    for (const digit of amount) {
      const keyName = digit === '.' ? 'keypad-key-dot' : `keypad-key-${digit}`;
      const digitEl = isAndroid
        ? Matchers.getElementByText(digit)
        : Matchers.getElementByNativeXPath(`//*[contains(@name,'${keyName}')]`);
      await Assertions.expectElementToBeVisible(digitEl, {
        timeout: TIMEOUT.KEYPAD_DIGIT,
        description: `Keypad digit ${digit} should be visible`,
      });
      await Gestures.waitAndTap(digitEl, {
        checkForDisplayed: true,
        checkEnabled: true,
        delay: 1000,
        elemDescription: `Keypad ${digit}`,
      });
    }
  }

  async tapContinue(): Promise<void> {
    await Gestures.waitAndTap(this.continueButtonByText, {
      elemDescription: 'Continue (by text) deposit confirmation',
      checkEnabled: false,
      checkVisibility: false,
      checkForDisplayed: true,
      delay: 1000,
    });
  }

  async tapAddFunds(): Promise<void> {
    await Gestures.waitAndTap(this.confirmButton, {
      elemDescription: 'Add funds (confirm)',
    });
  }
}

export default new PerpsDepositView();
