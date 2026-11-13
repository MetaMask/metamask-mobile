import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import Assertions from '../../framework/Assertions';
import Utilities from '../../framework/Utilities';
import { waitForStableEnabledIOS } from './waitForStableEnabledIOS';
import {
  PerpsOrderHeaderSelectorsIDs,
  PerpsOrderViewSelectorsIDs,
  PerpsAmountDisplaySelectorsIDs,
  PerpsLimitPriceBottomSheetSelectorsIDs,
  PerpsTPSLViewSelectorsIDs,
  PerpsLeverageBottomSheetSelectorsIDs,
  PerpsTradeSheetSelectorsIDs,
} from '../../../app/components/UI/Perps/Perps.testIds';
import { type AppiumElement, PlatformDetector } from '../../framework';

/**
 * Order entry surface. `screen` is the full-page PerpsOrderView (A/B control);
 * `sheet` is the PerpsTradeScreen bottom sheet (A/B treatment).
 */
export type PerpsOrderSurface = 'screen' | 'sheet';

class PerpsOrderView {
  /** Place order button - wdio uses 'perps-order-view-place-order-button' */
  get placeOrderButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PerpsOrderViewSelectorsIDs.PLACE_ORDER_BUTTON,
    );
  }

  /**
   * Fees row value — only mounted after fee loading finishes
   * Useful readiness signal before tapping Long/Short on Appium.
   */
  get feesValue(): Promise<AppiumElement> {
    return Matchers.getElementByID(PerpsOrderViewSelectorsIDs.FEES_VALUE);
  }

  async waitForFeesReady(timeout = 30_000): Promise<void> {
    await Assertions.expectElementToBeVisible(this.feesValue, {
      timeout,
      description: 'Perps order fees value (fees finished loading)',
    });
  }

  /**
   * Opens Auto close / TPSL from the order form. The row is labeled TP/SL in UI;
   * production uses STOP_LOSS_BUTTON testID on that touchable (see PerpsOrderView.tsx).
   */
  get takeProfitButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(PerpsOrderViewSelectorsIDs.STOP_LOSS_BUTTON);
  }

  get turnNotificationsOnButton() {
    return Matchers.getElementByID(
      PerpsOrderViewSelectorsIDs.TURN_ON_NOTIFICATION_BUTTON,
    );
  }

  get keypadDeleteButton(): Promise<AppiumElement> {
    return Matchers.getElementByID('keypad-delete-button');
  }

  // Leverage chip by visible text, e.g., "3x", "10x", "20x"
  leverageOption(leverageX: number, index = 0): Promise<AppiumElement> {
    return Matchers.getElementByText(`${leverageX}x`, index);
  }

  /** Row label to open the leverage modal */
  get leverageRowLabel(): Promise<AppiumElement> {
    return Matchers.getElementByID(PerpsOrderViewSelectorsIDs.LEVERAGE_ROW);
  }

  // Modal title to ensure the leverage bottom sheet is visible
  get leverageModalTitle(): Promise<AppiumElement> {
    return Matchers.getElementByText('Set Leverage');
  }

  async tapPlaceOrderButton(): Promise<void> {
    await Utilities.waitForReadyState(this.placeOrderButton, {
      checkStability: true,
      timeout: 8000,
      elemDescription: 'Place order button',
    });
    await waitForStableEnabledIOS(this.placeOrderButton, {
      timeout: 22000,
      pollIntervalMs: 120,
      consecutiveSuccess: 5,
    });
    await Gestures.waitAndTap(this.placeOrderButton, {
      timeout: 35000,
      elemDescription: 'Place order button',
      checkForDisplayed: true,
      checkEnabled: true,
      checkStability: true,
      delay: 1000,
    });
  }

  async tapTakeProfitButton() {
    await Gestures.scrollToElement(
      this.takeProfitButton,
      Matchers.scrollContainer(PerpsOrderViewSelectorsIDs.SCROLL_VIEW),
      {
        direction: 'down',
        scrollAmount: 250,
        elemDescription: 'Scroll Perps order view to TP/SL row',
      },
    );
    await Gestures.waitAndTap(this.takeProfitButton, {
      elemDescription: 'Open TP/SL sheet from order form',
      checkStability: true,
    });
  }

  async tapTurnOnNotificationsButton() {
    await Gestures.waitAndTap(this.turnNotificationsOnButton, {
      elemDescription: 'Turn on Notifications Button',
    });
  }

  async selectLeverage(leverageX: number) {
    // Open leverage modal
    await Gestures.waitAndTap(this.leverageRowLabel, {
      elemDescription: 'Open leverage modal',
    });

    // Wait for the modal to be visible
    await Assertions.expectElementToBeVisible(this.leverageModalTitle, {
      description: 'Leverage modal title visible',
    });

    // Tap quick option (2x/5x/10x/20x/40x) deterministically using visibility checks
    // Detect the highest existing index and use it (button > slider label)
    const label = `${leverageX}x`;
    let chosenIdx = -1;
    for (const idx of [3, 2, 1, 0]) {
      const candidate = this.leverageOption(leverageX, idx);
      const exists = await Utilities.isElementVisible(candidate, 250);
      if (exists) {
        chosenIdx = idx;
        break;
      }
    }
    if (chosenIdx < 0) {
      throw new Error(`Leverage option ${label} not found`);
    }

    // Tap the detected option index
    const option = this.leverageOption(leverageX, chosenIdx);
    await Gestures.waitAndTap(option, {
      elemDescription: `Select leverage ${label} at index ${chosenIdx}`,
    });

    // Confirm by tapping footer button "Set Xx"
    const confirm = Matchers.getElementByText(`Set ${leverageX}x`);
    await Gestures.waitAndTap(confirm, {
      elemDescription: `Confirm leverage ${leverageX}x`,
    });
  }

  // Amount handling
  get amountDisplay(): Promise<AppiumElement> {
    return Matchers.getElementByID(PerpsAmountDisplaySelectorsIDs.CONTAINER);
  }

  get amountValue(): Promise<AppiumElement> {
    return Matchers.getElementByID(PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL);
  }

  getKeypadKey(key: string): Promise<AppiumElement> {
    if (PlatformDetector.isAndroid()) {
      return Matchers.getElementByID(`keypad-key-${key}`);
    }
    return Matchers.getElementByText(key);
  }

  getDoneButton(): Promise<AppiumElement> {
    return Matchers.getElementByText('Done');
  }

  getTpslDoneButton(): Promise<AppiumElement> {
    if (PlatformDetector.isAndroid()) {
      return Matchers.getElementByID(PerpsTPSLViewSelectorsIDs.DONE_BUTTON);
    }
    return Matchers.getElementByNativeXPath(
      "//*[@type='XCUIElementTypeButton' and (@name='Done' or @label='Done')]",
    );
  }

  getTpslKeypadKey(key: string): Promise<AppiumElement> {
    const testId = key === '.' ? 'keypad-key-dot' : `keypad-key-${key}`;
    return Matchers.getElementByID(testId);
  }

  private getTpslPriceInput(
    inputTestId:
      | typeof PerpsTPSLViewSelectorsIDs.TAKE_PROFIT_PRICE_INPUT
      | typeof PerpsTPSLViewSelectorsIDs.STOP_LOSS_PRICE_INPUT,
  ): Promise<AppiumElement> {
    return Matchers.getElementByID(inputTestId);
  }

  private get tpslSetButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(PerpsTPSLViewSelectorsIDs.SET_BUTTON);
  }

  private get tpslAutoCloseTitle(): Promise<AppiumElement> {
    return Matchers.getElementByText('Auto close');
  }

  // Amount slider and keypad, per order surface

  amountSlider(surface: PerpsOrderSurface): Promise<AppiumElement> {
    return Matchers.getElementByID(
      surface === 'sheet'
        ? PerpsTradeSheetSelectorsIDs.AMOUNT_SLIDER
        : PerpsOrderViewSelectorsIDs.AMOUNT_SLIDER,
    );
  }

  amountKeypadDoneButton(surface: PerpsOrderSurface): Promise<AppiumElement> {
    return Matchers.getElementByID(
      surface === 'sheet'
        ? PerpsTradeSheetSelectorsIDs.AMOUNT_KEYPAD_DONE_BUTTON
        : PerpsOrderViewSelectorsIDs.KEYPAD_DONE,
    );
  }

  /** Percentage label under the amount slider (only rendered while the keypad is closed). */
  amountSliderLabel(
    label: '25%' | '50%' | '75%' | '100%',
  ): Promise<AppiumElement> {
    return Matchers.getElementByText(label);
  }

  /**
   * Amount display element to read the USD amount from. Android exposes the
   * first text glyph ("$10"); on iOS only the pressable wrapper is an
   * accessibility element, so its label is read instead ("$10" on the screen,
   * "Order amount, 10" on the bottom sheet).
   */
  private get amountValueText(): Promise<AppiumElement> {
    if (PlatformDetector.isAndroid()) {
      return Matchers.getElementByNativeXPath(
        `//*[@resource-id='${PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL}']//android.widget.TextView`,
      );
    }
    return Matchers.getElementByID(PerpsAmountDisplaySelectorsIDs.TOUCHABLE);
  }

  /** Amount keypad key by testID (the text matcher is ambiguous on iOS). */
  private amountKeypadKey(key: string): Promise<AppiumElement> {
    return Matchers.getElementByID(`keypad-key-${key}`);
  }

  async waitForAmountSlider(surface: PerpsOrderSurface): Promise<void> {
    await Assertions.expectElementToBeVisible(this.amountSlider(surface), {
      description: `Perps ${surface} amount slider is visible`,
      timeout: 30_000,
    });
  }

  async tapAmountSliderLabel(
    label: '25%' | '50%' | '75%' | '100%',
  ): Promise<void> {
    await Gestures.waitAndTap(this.amountSliderLabel(label), {
      elemDescription: `Amount slider ${label} label`,
      checkForDisplayed: true,
    });
  }

  /** Opens the amount keypad, clears the current amount and types `amount`. */
  async typeAmountOnKeypad(
    surface: PerpsOrderSurface,
    amount: string,
  ): Promise<void> {
    await Gestures.waitAndTap(this.amountValue, {
      elemDescription: 'Open amount keypad by tapping amount label',
      checkEnabled: true,
      checkVisibility: true,
    });
    await Assertions.expectElementToBeVisible(
      this.amountKeypadDoneButton(surface),
      { description: 'Amount keypad Done button is visible' },
    );
    const current = (await this.getAmountUsdText()).replace(/[^0-9.]/g, '');
    for (const digit of current) {
      await Gestures.waitAndTap(this.keypadDeleteButton, {
        checkForDisplayed: true,
        elemDescription: `Keypad: delete ${digit}`,
      });
    }
    for (const ch of amount) {
      await Gestures.waitAndTap(this.amountKeypadKey(ch), {
        checkForDisplayed: true,
        elemDescription: `Keypad: ${ch}`,
      });
    }
    await this.expectAmountUsd(
      amount || '0',
      `Keypad shows $${amount || '0'} before Done`,
    );
  }

  /** Real driver tap on the amount keypad Done button. */
  async tapAmountKeypadDone(surface: PerpsOrderSurface): Promise<void> {
    await Gestures.waitAndTap(this.amountKeypadDoneButton(surface), {
      elemDescription: 'Amount keypad Done',
      checkForDisplayed: true,
    });
  }

  /** Current USD amount without thousands separators, e.g. "$5970". */
  async getAmountUsdText(): Promise<string> {
    const amountElement = await this.amountValueText;
    if (PlatformDetector.isAndroid()) {
      return ((await amountElement.textContent()) ?? '')
        .trim()
        .replace(/,/g, '');
    }
    const label = (await amountElement.getAttribute('label')) ?? '';
    const value = label.split(', ').pop() ?? '';
    return `$${value.replace(/[$,\s]/g, '')}`;
  }

  /**
   * Slider position in percent, read from the accessibility value the slider
   * exposes ("25%" on the screen, "Order amount, 25%" on the sheet).
   */
  async getAmountSliderPercent(surface: PerpsOrderSurface): Promise<number> {
    const slider = await this.amountSlider(surface);
    const raw =
      (await slider.getAttribute(
        PlatformDetector.isAndroid() ? 'content-desc' : 'value',
      )) ?? '';
    const match = raw.match(/(\d+(?:\.\d+)?)%/);
    if (!match) {
      throw new Error(`Could not read amount slider percent from "${raw}"`);
    }
    return Number(match[1]);
  }

  /** Asserts the USD amount, ignoring thousands separators ("$5,000"). */
  async expectAmountUsd(amount: string, description: string): Promise<void> {
    const expected = `$${amount}`;
    await Utilities.executeWithRetry(
      async () => {
        const actual = await this.getAmountUsdText();
        if (actual !== expected) {
          throw new Error(`Expected amount "${expected}" but got "${actual}"`);
        }
      },
      { description: `Assert ${description}` },
    );
  }

  async expectAmountSliderNotAtZero(surface: PerpsOrderSurface): Promise<void> {
    await this.waitForAmountSlider(surface);
    const percent = await this.getAmountSliderPercent(surface);
    if (!(percent > 0)) {
      throw new Error(`Amount slider is at ${percent}% after keypad Done`);
    }
  }

  // Required for next test
  async setAmountUSD(amount: string): Promise<void> {
    await Assertions.expectElementToBeVisible(this.amountValue, {
      description: 'Amount value is visible',
    });
    await Gestures.waitAndTap(this.amountValue, {
      elemDescription: 'Open amount keypad by tapping amount label',
      checkEnabled: true,
      checkVisibility: true,
    });
    await Gestures.waitAndTap(this.keypadDeleteButton, {
      checkForDisplayed: true,
      checkEnabled: true,
    });
    await Gestures.waitAndTap(this.keypadDeleteButton, {
      checkForDisplayed: true,
      checkEnabled: true,
    });
    for (const ch of amount) {
      await Gestures.waitAndTap(this.getKeypadKey(ch), {
        checkForDisplayed: true,
        delay: 300,
        elemDescription: `Keypad: ${ch}`,
      });
    }
    await Gestures.waitAndTap(this.getDoneButton(), {
      checkForDisplayed: true,
      elemDescription: 'Tap Done (by text) to close keypad',
    });
  }

  // Order type / Limit Price helpers
  private get orderTypeMarket(): Promise<AppiumElement> {
    return Matchers.getElementByText('Market');
  }

  private get orderTypeSelector(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PerpsOrderHeaderSelectorsIDs.ORDER_TYPE_BUTTON,
    );
  }
  private get orderTypeLimit(): Promise<AppiumElement> {
    return Matchers.getElementByText('Limit');
  }

  async openOrderTypeSelector(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.orderTypeSelector, {
      description: 'Order type selector button',
      timeout: 20000,
    });
    await Gestures.waitAndTap(this.orderTypeSelector, {
      elemDescription: 'Open order type selector',
      timeout: 20000,
      checkForDisplayed: true,
      checkEnabled: true,
    });
  }

  async selectLimitOrderType() {
    await Gestures.waitAndTap(this.orderTypeLimit, {
      elemDescription: 'Select Limit order type',
      checkForDisplayed: true,
      timeout: 15000,
    });
  }

  async selectMarketOrderType() {
    await Gestures.waitAndTap(this.orderTypeMarket, {
      elemDescription: 'Select Market order type',
    });
  }

  /**
   * On PerpsTPSL (Auto close), focus TP or SL trigger price, enter via keypad, Done, Set.
   */
  private async enterTpslTriggerPriceViaKeypad(
    price: string,
    inputTestId:
      | typeof PerpsTPSLViewSelectorsIDs.TAKE_PROFIT_PRICE_INPUT
      | typeof PerpsTPSLViewSelectorsIDs.STOP_LOSS_PRICE_INPUT,
    focusInputElemDescription: string,
  ): Promise<void> {
    await Assertions.expectElementToBeVisible(this.tpslAutoCloseTitle, {
      description: 'TPSL Auto close screen visible',
      timeout: 15000,
    });

    const input = this.getTpslPriceInput(inputTestId);
    const firstKey = price[0] ?? '0';

    await Utilities.executeWithRetry(
      async () => {
        await Gestures.waitAndTap(input, {
          elemDescription: focusInputElemDescription,
          checkForDisplayed: true,
          checkEnabled: false,
        });
        await Assertions.expectElementToBeVisible(
          this.getTpslKeypadKey(firstKey),
          {
            description: `TPSL keypad key ${firstKey} should be visible`,
            timeout: 5000,
          },
        );
      },
      {
        timeout: 20000,
        interval: 1000,
        description: 'Focus TPSL input and wait for keypad',
        elemDescription: focusInputElemDescription,
      },
    );

    for (const ch of price) {
      const keypadKey = this.getTpslKeypadKey(ch);

      if (!(await Utilities.isElementVisible(keypadKey, 1500))) {
        await Gestures.waitAndTap(input, {
          elemDescription: `${focusInputElemDescription} (refocus keypad)`,
          checkForDisplayed: true,
          checkEnabled: false,
        });
      }

      await Gestures.waitAndTap(keypadKey, {
        elemDescription: `TPSL keypad key ${ch}`,
        checkForDisplayed: true,
        checkEnabled: false,
      });
    }

    await Gestures.waitAndTap(this.getTpslDoneButton(), {
      elemDescription: 'Dismiss TPSL keypad (Done)',
      checkForDisplayed: true,
      checkEnabled: false,
    });
    await Gestures.waitAndTap(this.tpslSetButton, {
      elemDescription: 'Confirm TP/SL (Set)',
      checkForDisplayed: true,
      checkEnabled: true,
    });
  }

  /**
   * On PerpsTPSL (Auto close), focus TP trigger price and enter value via the in-view Keypad,
   * then dismiss the keypad and confirm with Set.
   */
  async enterCustomTakeProfitTriggerPrice(price: string): Promise<void> {
    await this.enterTpslTriggerPriceViaKeypad(
      price,
      PerpsTPSLViewSelectorsIDs.TAKE_PROFIT_PRICE_INPUT,
      'Focus take profit trigger price input',
    );
  }

  /**
   * On PerpsTPSL (Auto close), focus SL trigger price and enter value via the in-view Keypad,
   * then dismiss the keypad and confirm with Set.
   */
  async enterCustomStopLossTriggerPrice(price: string): Promise<void> {
    await this.enterTpslTriggerPriceViaKeypad(
      price,
      PerpsTPSLViewSelectorsIDs.STOP_LOSS_PRICE_INPUT,
      'Focus stop loss trigger price input',
    );
  }

  async setLimitPricePreset(preset: string) {
    const presetButton =
      preset === 'Mid'
        ? Matchers.getElementByID(
            PerpsLimitPriceBottomSheetSelectorsIDs.PRESET_MID,
          )
        : Matchers.getElementByText(preset);
    await Gestures.scrollIntoView(presetButton);
    await Gestures.waitAndTap(presetButton, {
      checkForDisplayed: true,
      timeout: 20000,
      elemDescription: `Select limit price preset ${preset}`,
    });
  }

  /** @deprecated Use {@link setLimitPricePreset} */
  async setLimitPricePresetLong(preset: string) {
    await this.setLimitPricePreset(preset);
  }

  async setLimitPricePresetNamed(preset: 'Bid' | 'Ask') {
    const testId =
      preset === 'Bid'
        ? PerpsLimitPriceBottomSheetSelectorsIDs.PRESET_BID
        : PerpsLimitPriceBottomSheetSelectorsIDs.PRESET_ASK;
    await Gestures.waitAndTap(Matchers.getElementByID(testId), {
      elemDescription: `Select limit price preset ${preset}`,
    });
  }

  async setLimitPricePresetPercent(percentage: number) {
    const presetButton = Matchers.getElementByID(
      `${PerpsLimitPriceBottomSheetSelectorsIDs.PRESET_PERCENT}${percentage}`,
    );
    await Gestures.waitAndTap(presetButton, {
      elemDescription: `Select limit price preset ${percentage}%`,
    });
  }

  async confirmLimitPrice() {
    const setButton = Matchers.getElementByID(
      PerpsLimitPriceBottomSheetSelectorsIDs.CONFIRM_BUTTON,
    );
    await Gestures.waitAndTap(setButton, {
      elemDescription: 'Confirm limit price',
    });
  }

  /**
   * Set leverage — opens the modal, scrolls the horizontal picker to the
   * target value, taps it, then confirms with the Set button.
   *
   * The picker is a snapping horizontal ScrollView; items outside the visible
   * window must be scrolled into view before they can be tapped.
   */
  async setLeverageAppium(leverageX: number): Promise<void> {
    await Gestures.waitAndTap(this.leverageRowLabel, {
      elemDescription: 'Open leverage modal',
    });

    const pickerItem = Matchers.getElementByID(
      `${PerpsLeverageBottomSheetSelectorsIDs.PICKER_ITEM}-${leverageX}`,
    );
    const picker = await Matchers.getElementByID(
      PerpsLeverageBottomSheetSelectorsIDs.PICKER,
    );

    for (let attempt = 0; attempt < 15; attempt++) {
      if (await Utilities.isElementVisible(pickerItem, 500)) break;
      await Gestures.swipe(picker, 'left');
    }

    await Gestures.waitAndTap(pickerItem, {
      elemDescription: `Select leverage ${leverageX}x`,
    });

    await Gestures.waitAndTap(
      Matchers.getElementByID(PerpsLeverageBottomSheetSelectorsIDs.SET_BUTTON),
      { elemDescription: `Confirm leverage ${leverageX}x` },
    );
  }

  async tapPlaceOrder(): Promise<void> {
    await this.tapPlaceOrderButton();
  }
}

export default new PerpsOrderView();
