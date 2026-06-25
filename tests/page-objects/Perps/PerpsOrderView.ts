import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import UnifiedGestures from '../../framework/UnifiedGestures';
import Assertions from '../../framework/Assertions';
import Utilities from '../../framework/Utilities';
import { waitForStableEnabledIOS } from './waitForStableEnabledIOS';
import {
  PerpsOrderHeaderSelectorsIDs,
  PerpsOrderViewSelectorsIDs,
  PerpsAmountDisplaySelectorsIDs,
  PerpsLimitPriceBottomSheetSelectorsIDs,
  PerpsTPSLViewSelectorsIDs,
  PerpsMarketDetailsViewSelectorsIDs,
} from '../../../app/components/UI/Perps/Perps.testIds';
import {
  asDetoxElement,
  asPlaywrightElement,
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import { element as detoxElement, by as detoxBy } from 'detox';
import {
  encapsulatedAction,
  PlatformDetector,
  PlaywrightElement,
  PlaywrightGestures,
} from '../../framework';

class PerpsOrderView {
  /** Place order button - wdio uses 'perps-order-view-place-order-button' */
  get placeOrderButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(PerpsOrderViewSelectorsIDs.PLACE_ORDER_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PerpsOrderViewSelectorsIDs.PLACE_ORDER_BUTTON,
          { exact: true },
        ),
    });
  }

  /**
   * Opens Auto close / TPSL from the order form. The row is labeled TP/SL in UI;
   * production uses STOP_LOSS_BUTTON testID on that touchable (see PerpsOrderView.tsx).
   */
  get takeProfitButton(): EncapsulatedElementType {
    return Matchers.getElementByID(PerpsOrderViewSelectorsIDs.STOP_LOSS_BUTTON);
  }

  get turnNotificationsOnButton() {
    return Matchers.getElementByID(
      PerpsOrderViewSelectorsIDs.TURN_ON_NOTIFICATION_BUTTON,
    );
  }

  get keypadDeleteButton(): EncapsulatedElementType {
    return encapsulated({
      appium: () => PlaywrightMatchers.getElementById('keypad-delete-button'),
    });
  }

  // Leverage chip by visible text, e.g., "3x", "10x", "20x"
  leverageOption(leverageX: number, index = 0): EncapsulatedElementType {
    return Matchers.getElementByText(`${leverageX}x`, index);
  }

  /** Row label to open the leverage modal - wdio uses getElementByText('Leverage') */
  get leverageRowLabel(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText('Leverage'),
      appium: () => PlaywrightMatchers.getElementByText('Leverage'),
    });
  }

  // Modal title to ensure the leverage bottom sheet is visible
  get leverageModalTitle(): EncapsulatedElementType {
    return Matchers.getElementByText('Set Leverage');
  }

  async tapPlaceOrderButton(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        const el = asDetoxElement(this.placeOrderButton);
        await Utilities.waitForReadyState(el, {
          checkStability: false,
          timeout: 8000,
          elemDescription: 'Place order button',
        });
        await waitForStableEnabledIOS(el, {
          timeout: 22000,
          pollIntervalMs: 120,
          consecutiveSuccess: 5,
        });
        await Gestures.waitAndTap(el, {
          timeout: 35000,
          elemDescription: 'Place order button',
        });
      },
      appium: async () => {
        const el = await asPlaywrightElement(this.placeOrderButton);
        await PlaywrightGestures.waitAndTap(el, {
          checkForDisplayed: true,
          checkForEnabled: true,
          checkForStable: true,
          delay: 1000,
        });
      },
    });
  }

  async tapTakeProfitButton() {
    await Gestures.scrollToElement(
      this.takeProfitButton,
      Matchers.scrollContainer(PerpsMarketDetailsViewSelectorsIDs.SCROLL_VIEW),
      {
        direction: 'down',
        scrollAmount: 250,
        elemDescription: 'Scroll Perps market details to TP/SL row',
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
    await UnifiedGestures.waitAndTap(this.leverageRowLabel, {
      description: 'Open leverage modal',
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
      const candidate = detoxElement(detoxBy.text(label)).atIndex(idx);
      const exists = await Utilities.isElementVisible(
        candidate as unknown as DetoxElement,
        250,
      );
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
    const confirm = Matchers.getElementByText(
      `Set ${leverageX}x`,
    ) as DetoxElement;
    await Gestures.waitAndTap(confirm, {
      elemDescription: `Confirm leverage ${leverageX}x`,
    });
  }

  // Amount handling
  get amountDisplay(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(PerpsAmountDisplaySelectorsIDs.CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PerpsAmountDisplaySelectorsIDs.CONTAINER,
          { exact: true },
        ),
    });
  }

  get amountValue(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL,
          { exact: true },
        ),
    });
  }

  getKeypadKey(key: string): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText(key),
      appium: () => PlaywrightMatchers.getElementByText(key),
    });
  }

  getDoneButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText('Done'),
      appium: () => PlaywrightMatchers.getElementByText('Done'),
    });
  }

  getTpslDoneButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText('Done'),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            PerpsTPSLViewSelectorsIDs.DONE_BUTTON,
            { exact: true },
          ),
        ios: () =>
          PlaywrightMatchers.getElementByXPath(
            "//*[@type='XCUIElementTypeButton' and (@name='Done' or @label='Done')]",
          ),
      },
    });
  }

  getTpslKeypadKey(key: string): EncapsulatedElementType {
    const testId = key === '.' ? 'keypad-key-dot' : `keypad-key-${key}`;
    return Matchers.getElementByID(testId);
  }

  // Required for next test
  async setAmountUSD(amount: string): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        // Open keypad by tapping the value by ID (more reliable than tapping the container)
        await device.disableSynchronization();
        await Assertions.expectElementToBeVisible(
          asDetoxElement(this.amountValue),
          {
            description: 'Amount value is visible',
          },
        );
        await Gestures.waitAndTap(asDetoxElement(this.amountValue), {
          elemDescription: 'Open amount keypad by tapping amount label',
          checkEnabled: false,
          checkVisibility: false,
        });
        // Type each character using the native keypad (buttons 0-9 and '.')
        for (const ch of amount) {
          await Gestures.waitAndTap(asDetoxElement(this.getKeypadKey(ch)), {
            elemDescription: `Keypad: ${ch}`,
            checkEnabled: false,
            checkVisibility: false,
          });
        }
        // Close the keypad using the Done button
        await Gestures.waitAndTap(asDetoxElement(this.getDoneButton()), {
          elemDescription: 'Tap Done (by text) to close keypad',
          checkEnabled: false,
          checkVisibility: false,
        });
        await device.enableSynchronization();
      },
      appium: async () => {
        const amountEl = await asPlaywrightElement(this.amountValue);
        await PlaywrightGestures.waitAndTap(amountEl, {
          checkForDisplayed: true,
          checkForEnabled: true,
        });
        // Type each character using the native keypad (buttons 0-9 and '.')
        await UnifiedGestures.waitAndTap(this.keypadDeleteButton, {
          checkForDisplayed: true,
          checkForEnabled: true,
        });
        await UnifiedGestures.waitAndTap(this.keypadDeleteButton, {
          checkForDisplayed: true,
          checkForEnabled: true,
        });
        for (const ch of amount) {
          const keyEl = await asPlaywrightElement(this.getKeypadKey(ch));
          await PlaywrightGestures.waitAndTap(keyEl, {
            checkForDisplayed: true,
            delay: 300,
          });
        }
        // Close the keypad using the Done button
        const doneEl = await asPlaywrightElement(this.getDoneButton());
        await PlaywrightGestures.waitAndTap(doneEl, {
          checkForDisplayed: true,
        });
      },
    });
  }

  // Order type / Limit Price helpers
  private get orderTypeMarket(): EncapsulatedElementType {
    return Matchers.getElementByText('Market');
  }

  private get orderTypeSelector(): EncapsulatedElementType {
    return Matchers.getElementByID(
      PerpsOrderHeaderSelectorsIDs.ORDER_TYPE_BUTTON,
    );
  }
  private get orderTypeLimit(): EncapsulatedElementType {
    return Matchers.getElementByText('Limit');
  }

  async openOrderTypeSelector(): Promise<void> {
    await Gestures.waitAndTap(this.orderTypeSelector, {
      elemDescription: 'Open order type selector',
    });
  }

  async selectLimitOrderType() {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.waitAndTap(this.orderTypeLimit, {
          elemDescription: 'Select Limit order type',
        });
      },
      appium: async () => {
        const limitEl = await PlaywrightMatchers.getElementByText('Limit');
        await PlaywrightGestures.waitAndTap(limitEl, {
          checkForDisplayed: true,
          timeout: 15000,
        });
      },
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
    await Assertions.expectElementToBeVisible(
      Matchers.getElementByText('Auto close'),
      {
        description: 'TPSL Auto close screen visible',
        timeout: 15000,
      },
    );

    const input = Matchers.getElementByID(inputTestId);

    await Utilities.executeWithRetry(
      async () => {
        await UnifiedGestures.waitAndTap(input, {
          description: focusInputElemDescription,
          checkForDisplayed: true,
          checkForEnabled: false,
        });
        await Assertions.expectElementToBeVisible(
          this.getTpslKeypadKey(price[0] ?? '2'),
          {
            description: 'TPSL keypad visible',
            timeout: 5000,
          },
        );
      },
      {
        timeout: 20000,
        interval: 1000,
        description: 'Open TPSL keypad',
        elemDescription: focusInputElemDescription,
      },
    );

    for (const ch of price) {
      const keypadKey = this.getTpslKeypadKey(ch);

      if (!(await Utilities.isElementVisible(keypadKey, 1500))) {
        await UnifiedGestures.waitAndTap(input, {
          description: `${focusInputElemDescription} (refocus keypad)`,
          checkForDisplayed: true,
          checkForEnabled: false,
        });
      }

      await UnifiedGestures.waitAndTap(keypadKey, {
        description: `TPSL keypad key ${ch}`,
        checkForDisplayed: true,
        checkForEnabled: false,
      });
    }

    await UnifiedGestures.waitAndTap(this.getTpslDoneButton(), {
      description: 'Dismiss TPSL keypad (Done)',
      checkForDisplayed: true,
      checkForEnabled: false,
    });
    await UnifiedGestures.waitAndTap(
      Matchers.getElementByID(PerpsTPSLViewSelectorsIDs.SET_BUTTON),
      {
        description: 'Confirm TP/SL (Set)',
        checkForDisplayed: true,
        checkForEnabled: true,
      },
    );
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
    await encapsulatedAction({
      detox: async () => {
        const presetButton =
          preset === 'Mid'
            ? Matchers.getElementByID(
                PerpsLimitPriceBottomSheetSelectorsIDs.PRESET_MID,
              )
            : Matchers.getElementByText(preset);
        await Gestures.waitAndTap(presetButton, {
          elemDescription: `Select limit price preset ${preset}`,
        });
      },
      appium: async () => {
        const presetButton =
          preset === 'Mid'
            ? await PlaywrightMatchers.getElementById(
                PerpsLimitPriceBottomSheetSelectorsIDs.PRESET_MID,
                { exact: true },
              )
            : await PlaywrightMatchers.getElementByText(preset);
        await PlaywrightGestures.scrollIntoView(presetButton);
        await PlaywrightGestures.waitAndTap(presetButton, {
          checkForDisplayed: true,
          timeout: 20000,
        });
      },
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
   * Set leverage for appium context — opens modal, selects option, confirms.
   */
  async setLeverageAppium(leverageX: number): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        // Tap "Leverage" row to open modal
        await PlaywrightGestures.waitAndTap(
          await asPlaywrightElement(this.leverageRowLabel),
        );

        // Tap the leverage quick-select button (e.g. "40x")
        const leverageSelector = `${leverageX}x`;
        let optionEl: PlaywrightElement;
        if (PlatformDetector.isAndroid()) {
          optionEl = await PlaywrightMatchers.getElementByXPath(
            `//android.view.ViewGroup[@content-desc="${leverageSelector}"]`,
          );
        } else {
          optionEl = await PlaywrightMatchers.getElementByAccessibilityId(
            `quick-select-button-${leverageSelector}`,
          );
        }
        await PlaywrightGestures.waitAndTap(optionEl);

        // Tap confirm button (e.g. "Set 40x")
        const confirmEl = await PlaywrightMatchers.getElementByText(
          `Set ${leverageX}x`,
        );
        await PlaywrightGestures.waitAndTap(confirmEl);
      },
    });
  }

  async tapPlaceOrder(): Promise<void> {
    await this.tapPlaceOrderButton();
  }
}

export default new PerpsOrderView();
