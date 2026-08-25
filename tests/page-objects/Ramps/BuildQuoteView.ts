import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Utilities from '../../framework/Utilities';

import { BuildQuoteSelectors } from '../../../app/components/UI/Ramp/Aggregator/Views/BuildQuote/BuildQuote.testIds';
import { BUILD_QUOTE_TEST_IDS } from '../../../app/components/UI/Ramp/Views/BuildQuote/BuildQuote.testIds';
import { AddressSelectorSelectors } from '../../../app/components/Views/AddressSelector/AddressSelector.testIds';
import { type AppiumElement } from '../../framework';

class BuildQuoteView {
  get amountToBuyLabel(): Promise<AppiumElement> {
    return Matchers.getElementByText(BuildQuoteSelectors.AMOUNT_TO_BUY_LABEL);
  }

  get amountToSellLabel(): Promise<AppiumElement> {
    return Matchers.getElementByText(BuildQuoteSelectors.AMOUNT_TO_SELL_LABEL);
  }

  get getQuotesButton(): Promise<AppiumElement> {
    return Matchers.getElementByText(BuildQuoteSelectors.GET_QUOTES_BUTTON);
  }

  get cancelButton(): Promise<AppiumElement> {
    return Matchers.getElementByText(BuildQuoteSelectors.CANCEL_BUTTON_TEXT);
  }

  get selectRegionDropdown(): Promise<AppiumElement> {
    return Matchers.getElementByText(BuildQuoteSelectors.SELECT_REGION);
  }

  get selectPaymentMethodDropdown(): Promise<AppiumElement> {
    return Matchers.getElementByText(BuildQuoteSelectors.SELECT_PAYMENT_METHOD);
  }

  get selectCurrencyDropdown(): Promise<AppiumElement> {
    return Matchers.getElementByID(BuildQuoteSelectors.SELECT_CURRENCY);
  }

  get amountInput(): Promise<AppiumElement> {
    return Matchers.getElementByID(BuildQuoteSelectors.AMOUNT_INPUT);
  }

  get regionDropdown(): Promise<AppiumElement> {
    return Matchers.getElementByID(BuildQuoteSelectors.REGION_DROPDOWN);
  }

  get accountPicker(): Promise<AppiumElement> {
    return Matchers.getElementByID(BuildQuoteSelectors.ACCOUNT_PICKER);
  }

  get minLimitErrorMessage(): Promise<AppiumElement> {
    return Matchers.getElementByID(BuildQuoteSelectors.MIN_LIMIT_ERROR);
  }

  get maxLimitErrorMessage(): Promise<AppiumElement> {
    return Matchers.getElementByID(BuildQuoteSelectors.MAX_LIMIT_ERROR);
  }

  get insufficientBalanceErrorMessage(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      BuildQuoteSelectors.INSUFFICIENT_BALANCE_ERROR,
    );
  }

  get keypadDeleteButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON);
  }

  get doneButton(): Promise<AppiumElement> {
    return Matchers.getElementByText(BuildQuoteSelectors.DONE_BUTTON);
  }

  get continueButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(BuildQuoteSelectors.CONTINUE_BUTTON);
  }

  get backButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(BUILD_QUOTE_TEST_IDS.BACK_BUTTON);
  }

  get quickAmount25(): Promise<AppiumElement> {
    return Matchers.getElementByLabel('25%');
  }

  get quickAmount50(): Promise<AppiumElement> {
    return Matchers.getElementByLabel('50%');
  }

  get quickAmount75(): Promise<AppiumElement> {
    return Matchers.getElementByLabel('75%');
  }

  get quickAmountMax(): Promise<AppiumElement> {
    return Matchers.getElementByLabel('MAX');
  }

  get accountPickerDropdown(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      AddressSelectorSelectors.ACCOUNT_PICKER_DROPDOWN,
    );
  }

  async tapCancelButton(): Promise<void> {
    await Gestures.waitAndTap(this.cancelButton, {
      elemDescription: 'Cancel Button in Build Quote View',
    });
  }

  async tapAccountPicker(): Promise<void> {
    await Gestures.waitAndTap(this.accountPicker, {
      elemDescription: 'Account Picker in Build Quote View',
    });
  }

  async tapContinueButton(): Promise<void> {
    await Utilities.waitForElementToBeEnabled(this.continueButton);

    await Gestures.waitAndTap(this.continueButton, {
      timeout: 2500,
      elemDescription: 'Continue Button in Build Quote View',
    });
  }

  async tapBackButton(): Promise<void> {
    await Gestures.waitAndTap(this.backButton, {
      elemDescription: 'Back Button in Build Quote View',
    });
  }

  async tapSelectAddressDropdown(): Promise<void> {
    await Gestures.waitAndTap(this.accountPickerDropdown, {
      elemDescription: 'Account dropdown in address selector',
    });
  }

  async dismissAccountSelector(): Promise<void> {
    await Gestures.swipe(this.accountPickerDropdown, 'down', {
      speed: 'fast',
    });
  }

  async selectToken(token: string): Promise<void> {
    const tokenOption = Matchers.getElementByText(token);
    await Gestures.waitAndTap(tokenOption, {
      elemDescription: `Token Option (${token}) in Build Quote View`,
    });
  }

  async tapTokenDropdown(token: string): Promise<void> {
    const tokenOption = Matchers.getElementByText(token);
    await Gestures.waitAndTap(tokenOption, {
      elemDescription: `Token Dropdown (${token}) in Build Quote View`,
    });
  }

  async tapSelectRegionDropdown(): Promise<void> {
    await Gestures.waitAndTap(this.selectRegionDropdown, {
      elemDescription: 'Select Region Dropdown in Build Quote View',
    });
  }

  async tapCurrencySelector(): Promise<void> {
    await Gestures.waitAndTap(this.selectCurrencyDropdown, {
      elemDescription: 'Select Currency Dropdown in Build Quote View',
    });
  }

  async enterAmount(
    amount: string,
    rampsType: 'unifiedBuy' | 'sell' = 'sell',
  ): Promise<void> {
    await Gestures.waitAndTap(this.amountInput, {
      elemDescription: 'Amount Input in Build Quote View',
    });

    // Both onramp and offramp enter digits using keypad
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let digit = 0; digit < amount.length; digit++) {
      const numberButton = Matchers.getElementByText(amount[digit]);
      await Gestures.waitAndTap(numberButton, {
        elemDescription: `Number Button (${amount[digit]}) in Build Quote View`,
      });
    }

    // Sell: Tap done button to close keypad
    if (rampsType === 'sell') {
      await Gestures.waitAndTap(this.doneButton, {
        elemDescription:
          'Done Button after entering amount in Build Quote View',
      });
    }
  }

  async tapGetQuotesButton() {
    await Gestures.waitAndTap(this.getQuotesButton, {
      elemDescription: 'Get Quotes Button in Build Quote View',
    });
  }

  async tapPaymentMethodDropdown(
    paymentMethod: string | RegExp,
  ): Promise<void> {
    const paymentMethodOption =
      typeof paymentMethod === 'string'
        ? Matchers.getElementByText(paymentMethod)
        : Matchers.getElementByText(paymentMethod as RegExp);
    await Gestures.waitAndTap(paymentMethodOption, {
      elemDescription: `Payment Method Dropdown (${paymentMethod}) in Build Quote View`,
    });
  }

  async getPaymentMethodDropdownText(
    regex: string | RegExp,
  ): Promise<string | undefined> {
    try {
      const elem =
        typeof regex === 'string'
          ? Matchers.getElementByText(regex)
          : Matchers.getElementByText(regex as RegExp);
      return await Utilities.getElementText(elem);
    } catch (error) {
      // Purposefully returning undefined to use in an assertion
      return undefined;
    }
  }

  async tapRegionSelector() {
    await Gestures.waitAndTap(this.regionDropdown, {
      elemDescription: 'Region Dropdown in Build Quote View',
    });
  }

  async tapKeypadDeleteButton(times: number): Promise<void> {
    await Gestures.waitAndTap(this.amountInput, {
      elemDescription: 'Amount Input in Build Quote View',
    });
    for (let i = 0; i < times; i++) {
      await Gestures.waitAndTap(this.keypadDeleteButton, {
        elemDescription: `Keypad Delete Button (${i + 1}) in Build Quote View`,
      });
    }
  }

  async tapQuickAmount25() {
    await Gestures.waitAndTap(this.quickAmount25, {
      elemDescription: 'Quick Amount 25% in Build Quote View',
    });
  }

  async tapQuickAmount50() {
    await Gestures.waitAndTap(this.quickAmount50, {
      elemDescription: 'Quick Amount 50% in Build Quote View',
    });
  }

  async tapQuickAmount75() {
    await Gestures.waitAndTap(this.quickAmount75, {
      elemDescription: 'Quick Amount 75% in Build Quote View',
    });
  }

  async tapQuickAmountMax() {
    await Gestures.waitAndTap(this.quickAmountMax, {
      elemDescription: 'Quick Amount Max in Build Quote View',
    });
  }
}

export default new BuildQuoteView();
