import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../framework/Assertions';
import {
  asPlaywrightElement,
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import {
  encapsulatedAction,
  PlatformDetector,
  PlaywrightAssertions,
  PlaywrightElement,
  PlaywrightGestures,
} from '../../framework';

const TIMEOUT = {
  KEYPAD_DIGIT: 10000,
} as const;

class PerpsDepositView {
  // Custom deposit keypad container
  get keypad(): DetoxElement {
    return Matchers.getElementByID('deposit-keyboard');
  }

  /** Amount input - wdio PerpsDepositScreen uses 'custom-amount-input' for isAmountInputVisible */
  get amountInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID('custom-amount-input'),
      appium: () =>
        PlaywrightMatchers.getElementById('custom-amount-input', {
          exact: true,
        }),
    });
  }

  /** Add funds button - wdio uses getElementByText('Add funds') for isAddFundsVisible */
  get addFundsButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText('Add funds'),
      appium: () => PlaywrightMatchers.getElementByText('Add funds'),
    });
  }

  /** Total text - wdio uses getElementByText('Total') for isTotalVisible */
  get totalText(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText('Total'),
      appium: () => PlaywrightMatchers.getElementByText('Total'),
    });
  }

  // Continue button (toolbar text)
  get continueButtonByText(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText('Continue'),
      appium: () => PlaywrightMatchers.getElementByCatchAll('Continue'),
    });
  }

  // Add funds (confirm) button on review screen. Uses testID for reliability:
  // the confirmation screen shows at most one "Add funds" (ConfirmButton);
  // index 1 was failing when no second "Add funds" existed in the hierarchy.
  get confirmButton(): DetoxElement {
    return Matchers.getElementByID('confirm-button');
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
    await encapsulatedAction({
      detox: async () => {
        // Types digits using the on-screen keypad (buttons 0-9 and '.')
        for (const ch of amount) {
          const key = Matchers.getElementByText(ch) as DetoxElement;
          await Gestures.waitAndTap(key, {
            elemDescription: `Keypad ${ch}`,
            checkEnabled: false,
            checkVisibility: false,
          });
        }
      },
      appium: async () => {
        let digitEl: PlaywrightElement;
        for (const digit of amount) {
          if (await PlatformDetector.isAndroid()) {
            digitEl = await PlaywrightMatchers.getElementByText(digit);
          } else {
            digitEl = await PlaywrightMatchers.getElementByXPath(
              `//*[contains(@name,'keypad-key-${digit}')]`,
            );
          }
          await PlaywrightAssertions.expectElementToBeVisible(digitEl, {
            timeout: TIMEOUT.KEYPAD_DIGIT,
            description: `Keypad digit ${digit} should be visible`,
          });
          await PlaywrightGestures.waitAndTap(digitEl, {
            checkForDisplayed: true,
            checkForEnabled: true,
            delay: 1000,
          });
        }
      },
    });
  }

  async tapContinue(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.waitAndTap(this.continueButtonByText, {
          elemDescription: 'Continue (by text) deposit confirmation',
          checkEnabled: false,
          checkVisibility: false,
        });
      },
      appium: async () => {
        await PlaywrightGestures.waitAndTap(
          await asPlaywrightElement(this.continueButtonByText),
          {
            checkForDisplayed: true,
            checkForEnabled: true,
            delay: 1000,
          },
        );
      },
    });
  }

  async tapAddFunds(): Promise<void> {
    await Gestures.waitAndTap(this.confirmButton, {
      elemDescription: 'Add funds (confirm)',
    });
  }
}

export default new PerpsDepositView();
