import Matchers from '../../framework/Matchers';
import Utilities from '../../framework/Utilities';

import { BuildQuoteSelectors } from '../../../app/components/UI/Ramp/Aggregator/Views/BuildQuote/BuildQuote.testIds';
import { AddressSelectorSelectors } from '../../../app/components/Views/AddressSelector/AddressSelector.testIds';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class BuildQuoteView {
  get amountToBuyLabel(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(BuildQuoteSelectors.AMOUNT_TO_BUY_LABEL),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          BuildQuoteSelectors.AMOUNT_TO_BUY_LABEL,
        ),
    });
  }

  get amountToSellLabel(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(BuildQuoteSelectors.AMOUNT_TO_SELL_LABEL),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          BuildQuoteSelectors.AMOUNT_TO_SELL_LABEL,
        ),
    });
  }

  get getQuotesButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(BuildQuoteSelectors.GET_QUOTES_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          BuildQuoteSelectors.GET_QUOTES_BUTTON,
        ),
    });
  }

  get cancelButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(BuildQuoteSelectors.CANCEL_BUTTON_TEXT),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          BuildQuoteSelectors.CANCEL_BUTTON_TEXT,
        ),
    });
  }

  get selectRegionDropdown(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText(BuildQuoteSelectors.SELECT_REGION),
      appium: () =>
        PlaywrightMatchers.getElementByText(BuildQuoteSelectors.SELECT_REGION),
    });
  }

  get selectPaymentMethodDropdown(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(BuildQuoteSelectors.SELECT_PAYMENT_METHOD),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          BuildQuoteSelectors.SELECT_PAYMENT_METHOD,
        ),
    });
  }

  get selectCurrencyDropdown(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(BuildQuoteSelectors.SELECT_CURRENCY),
      appium: () =>
        PlaywrightMatchers.getElementById(BuildQuoteSelectors.SELECT_CURRENCY),
    });
  }

  get amountInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(BuildQuoteSelectors.AMOUNT_INPUT),
      appium: () =>
        PlaywrightMatchers.getElementById(BuildQuoteSelectors.AMOUNT_INPUT),
    });
  }

  get regionDropdown(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(BuildQuoteSelectors.REGION_DROPDOWN),
      appium: () =>
        PlaywrightMatchers.getElementById(BuildQuoteSelectors.REGION_DROPDOWN),
    });
  }

  get accountPicker(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(BuildQuoteSelectors.ACCOUNT_PICKER),
      appium: () =>
        PlaywrightMatchers.getElementById(BuildQuoteSelectors.ACCOUNT_PICKER),
    });
  }

  get minLimitErrorMessage(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(BuildQuoteSelectors.MIN_LIMIT_ERROR),
      appium: () =>
        PlaywrightMatchers.getElementById(BuildQuoteSelectors.MIN_LIMIT_ERROR),
    });
  }

  get maxLimitErrorMessage(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(BuildQuoteSelectors.MAX_LIMIT_ERROR),
      appium: () =>
        PlaywrightMatchers.getElementById(BuildQuoteSelectors.MAX_LIMIT_ERROR),
    });
  }

  get insufficientBalanceErrorMessage(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(BuildQuoteSelectors.INSUFFICIENT_BALANCE_ERROR),
      appium: () =>
        PlaywrightMatchers.getElementById(
          BuildQuoteSelectors.INSUFFICIENT_BALANCE_ERROR,
        ),
    });
  }

  get keypadDeleteButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          BuildQuoteSelectors.KEYPAD_DELETE_BUTTON,
        ),
    });
  }

  get doneButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText(BuildQuoteSelectors.DONE_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementByText(BuildQuoteSelectors.DONE_BUTTON),
    });
  }

  get continueButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(BuildQuoteSelectors.CONTINUE_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(BuildQuoteSelectors.CONTINUE_BUTTON),
    });
  }

  get quickAmount25(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByLabel('25%'),
      appium: () => PlaywrightMatchers.getElementByAccessibilityId('25%'),
    });
  }

  get quickAmount50(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByLabel('50%'),
      appium: () => PlaywrightMatchers.getElementByAccessibilityId('50%'),
    });
  }

  get quickAmount75(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByLabel('75%'),
      appium: () => PlaywrightMatchers.getElementByAccessibilityId('75%'),
    });
  }

  get quickAmountMax(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByLabel('MAX'),
      appium: () => PlaywrightMatchers.getElementByAccessibilityId('MAX'),
    });
  }

  get accountPickerDropdown(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          AddressSelectorSelectors.ACCOUNT_PICKER_DROPDOWN,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AddressSelectorSelectors.ACCOUNT_PICKER_DROPDOWN,
        ),
    });
  }

  async tapCancelButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.cancelButton, {
      elemDescription: 'Cancel Button in Build Quote View',
    });
  }

  async tapAccountPicker(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.accountPicker, {
      elemDescription: 'Account Picker in Build Quote View',
    });
  }

  async tapContinueButton(): Promise<void> {
    await Utilities.waitForElementToBeEnabled(this.continueButton);

    await UnifiedGestures.waitAndTap(this.continueButton, {
      timeout: 2500,
      elemDescription: 'Continue Button in Build Quote View',
    });
  }

  async tapSelectAddressDropdown(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.accountPickerDropdown, {
      elemDescription: 'Account dropdown in address selector',
    });
  }

  async dismissAccountSelector(): Promise<void> {
    await UnifiedGestures.swipe(this.accountPickerDropdown, 'down', {
      speed: 'fast',
    });
  }

  async selectToken(token: string): Promise<void> {
    const tokenOption = Matchers.getElementByText(token);
    await UnifiedGestures.waitAndTap(tokenOption, {
      elemDescription: `Token Option (${token}) in Build Quote View`,
    });
  }

  async tapTokenDropdown(token: string): Promise<void> {
    const tokenOption = Matchers.getElementByText(token);
    await UnifiedGestures.waitAndTap(tokenOption, {
      elemDescription: `Token Dropdown (${token}) in Build Quote View`,
    });
  }

  async tapSelectRegionDropdown(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.selectRegionDropdown, {
      elemDescription: 'Select Region Dropdown in Build Quote View',
    });
  }

  async tapCurrencySelector(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.selectCurrencyDropdown, {
      elemDescription: 'Select Currency Dropdown in Build Quote View',
    });
  }

  async enterAmount(
    amount: string,
    rampsType: 'unifiedBuy' | 'sell' = 'sell',
  ): Promise<void> {
    await UnifiedGestures.waitAndTap(this.amountInput, {
      elemDescription: 'Amount Input in Build Quote View',
    });

    // Both onramp and offramp enter digits using keypad
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let digit = 0; digit < amount.length; digit++) {
      const numberButton = Matchers.getElementByText(amount[digit]);
      await UnifiedGestures.waitAndTap(numberButton, {
        elemDescription: `Number Button (${amount[digit]}) in Build Quote View`,
      });
    }

    // Sell: Tap done button to close keypad
    if (rampsType === 'sell') {
      await UnifiedGestures.waitAndTap(this.doneButton, {
        elemDescription:
          'Done Button after entering amount in Build Quote View',
      });
    }
  }

  async tapGetQuotesButton() {
    await UnifiedGestures.waitAndTap(this.getQuotesButton, {
      elemDescription: 'Get Quotes Button in Build Quote View',
    });
  }

  async tapPaymentMethodDropdown(
    paymentMethod: string | RegExp,
  ): Promise<void> {
    const paymentMethodOption = Matchers.getElementByText(paymentMethod);
    await UnifiedGestures.waitAndTap(paymentMethodOption, {
      elemDescription: `Payment Method Dropdown (${paymentMethod}) in Build Quote View`,
    });
  }

  async getPaymentMethodDropdownText(
    regex: string | RegExp,
  ): Promise<string | undefined> {
    try {
      const elem = await Matchers.getElementByText(regex);
      const attributes = await (
        elem as unknown as IndexableNativeElement
      ).getAttributes();
      return (
        (attributes as { text?: string; label?: string }).text ??
        (attributes as { text?: string; label?: string }).label
      );
    } catch (error) {
      // Purposefully returning undefined to use in an assertion
      return undefined;
    }
  }

  async tapRegionSelector() {
    await UnifiedGestures.waitAndTap(this.regionDropdown, {
      elemDescription: 'Region Dropdown in Build Quote View',
    });
  }

  async tapKeypadDeleteButton(times: number): Promise<void> {
    await UnifiedGestures.waitAndTap(this.amountInput, {
      elemDescription: 'Amount Input in Build Quote View',
    });
    for (let i = 0; i < times; i++) {
      await UnifiedGestures.waitAndTap(this.keypadDeleteButton, {
        elemDescription: `Keypad Delete Button (${i + 1}) in Build Quote View`,
      });
    }
  }

  async tapQuickAmount25() {
    await UnifiedGestures.waitAndTap(this.quickAmount25, {
      elemDescription: 'Quick Amount 25% in Build Quote View',
    });
  }

  async tapQuickAmount50() {
    await UnifiedGestures.waitAndTap(this.quickAmount50, {
      elemDescription: 'Quick Amount 50% in Build Quote View',
    });
  }

  async tapQuickAmount75() {
    await UnifiedGestures.waitAndTap(this.quickAmount75, {
      elemDescription: 'Quick Amount 75% in Build Quote View',
    });
  }

  async tapQuickAmountMax() {
    await UnifiedGestures.waitAndTap(this.quickAmountMax, {
      elemDescription: 'Quick Amount Max in Build Quote View',
    });
  }
}

export default new BuildQuoteView();
