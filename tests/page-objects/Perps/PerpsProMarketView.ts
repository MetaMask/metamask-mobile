import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import Utilities from '../../framework/Utilities';
import { getDriver } from '../../framework/AppiumUtilities';
import { PlatformDetector } from '../../framework/PlatformLocator';
import {
  getPerpsProOrderRowSelector,
  getPerpsProPositionRowSelector,
  PerpsModeSelectionBottomSheetSelectorsIDs,
  PerpsModeToggleSelectorsIDs,
  PerpsProMarketViewSelectorsIDs,
  PerpsProOrderFormSelectorsIDs,
} from '../../../app/components/UI/Perps/Perps.testIds';
import { type AppiumElement } from '../../framework';

class PerpsProMarketView {
  // ── Container ──────────────────────────────────────────────────────────────

  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(PerpsProMarketViewSelectorsIDs.CONTAINER);
  }

  // ── Mode toggle ────────────────────────────────────────────────────────────

  get liteModeSegment(): Promise<AppiumElement> {
    return Matchers.getElementByID(PerpsModeToggleSelectorsIDs.LITE_SEGMENT);
  }

  get proModeSegment(): Promise<AppiumElement> {
    return Matchers.getElementByID(PerpsModeToggleSelectorsIDs.PRO_SEGMENT);
  }

  get modeSelectionProOption(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PerpsModeSelectionBottomSheetSelectorsIDs.PRO_OPTION,
    );
  }

  get modeSelectionSheet(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PerpsModeSelectionBottomSheetSelectorsIDs.CONTAINER,
    );
  }

  get modeSelectionTitle(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PerpsModeSelectionBottomSheetSelectorsIDs.TITLE,
    );
  }

  // ── Order form ─────────────────────────────────────────────────────────────

  get directionLong(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PerpsProOrderFormSelectorsIDs.DIRECTION_LONG,
    );
  }

  get directionShort(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PerpsProOrderFormSelectorsIDs.DIRECTION_SHORT,
    );
  }

  get sizeInput(): Promise<AppiumElement> {
    return Matchers.getElementByID(PerpsProOrderFormSelectorsIDs.SIZE_INPUT);
  }

  /**
   * Size card ButtonBase exposed to a11y as the tappable control
   * (`perps-pro-order-form-size-field`). Nested SIZE_INPUT often reports
   * isDisplayed=false on iOS until this field focuses it.
   */
  get sizeField(): Promise<AppiumElement> {
    return Matchers.getElementByID(PerpsProOrderFormSelectorsIDs.SIZE_FIELD);
  }

  get orderTypeButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PerpsProOrderFormSelectorsIDs.ORDER_TYPE_BUTTON,
    );
  }

  get limitPriceInput(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PerpsProOrderFormSelectorsIDs.LIMIT_PRICE_INPUT,
    );
  }

  /**
   * Empty inline limit-price fields hide the native TextInput from TalkBack
   * (`importantForAccessibility="no"`). The Pressable `-field` is the control
   * that focuses and reveals the input.
   */
  get limitPriceField(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      `${PerpsProOrderFormSelectorsIDs.LIMIT_PRICE_INPUT}-field`,
    );
  }

  get midPriceButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PerpsProOrderFormSelectorsIDs.MID_PRICE_BUTTON,
    );
  }

  get tpslButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(PerpsProOrderFormSelectorsIDs.TPSL);
  }

  get placeOrderButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PerpsProOrderFormSelectorsIDs.PLACE_ORDER_BUTTON,
    );
  }

  get feesValue(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PerpsProOrderFormSelectorsIDs.SUMMARY_FEES_VALUE,
    );
  }

  // ── Positions panel ────────────────────────────────────────────────────────

  get positionsPanel(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PerpsProMarketViewSelectorsIDs.POSITIONS_PANEL,
    );
  }

  get ordersTab(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PerpsProMarketViewSelectorsIDs.POSITIONS_PANEL_TAB_ORDERS,
    );
  }

  get positionsTab(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PerpsProMarketViewSelectorsIDs.POSITIONS_PANEL_TAB_POSITIONS,
    );
  }

  positionRow(symbol: string): Promise<AppiumElement> {
    return Matchers.getElementByID(getPerpsProPositionRowSelector(symbol));
  }

  positionCloseButton(symbol: string): Promise<AppiumElement> {
    return Matchers.getElementByID(
      `${getPerpsProPositionRowSelector(symbol)}-${PerpsProMarketViewSelectorsIDs.POSITION_CLOSE}`,
    );
  }

  positionEditTpslButton(symbol: string): Promise<AppiumElement> {
    return Matchers.getElementByID(
      `${getPerpsProPositionRowSelector(symbol)}-${PerpsProMarketViewSelectorsIDs.POSITION_EDIT_TPSL}`,
    );
  }

  orderRow(symbol: string, index: number): Promise<AppiumElement> {
    return Matchers.getElementByID(getPerpsProOrderRowSelector(symbol, index));
  }

  // ── Mode switching ─────────────────────────────────────────────────────────

  /**
   * Switches to Pro mode.
   *
   * Perps home uses `variant="active"`: only the current-mode pill is mounted
   * (Lite → `LITE_SEGMENT`, and tapping it requests Pro). Market headers may
   * use the two-segment control where both segments exist — tap `PRO_SEGMENT`.
   * If only `PRO_SEGMENT` is present, we are already on the Pro active pill.
   */
  async switchToProMode(): Promise<void> {
    // Lite active-pill is the common path; only spend a full wait on Pro if Lite is absent.
    const liteSegmentVisible = await Utilities.isElementVisible(
      this.liteModeSegment,
      3000,
    );
    const proSegmentVisible = await Utilities.isElementVisible(
      this.proModeSegment,
      liteSegmentVisible ? 500 : 3000,
    );

    if (liteSegmentVisible && !proSegmentVisible) {
      // Active pill on Lite (home / market header) — tap to request Pro.
      await Gestures.waitAndTap(this.liteModeSegment, {
        elemDescription: 'Lite mode pill (switch to Pro)',
        timeout: 15000,
        checkForDisplayed: true,
      });
    } else if (liteSegmentVisible && proSegmentVisible) {
      // Two-segment toggle — tap Pro.
      await Gestures.waitAndTap(this.proModeSegment, {
        elemDescription: 'Pro mode toggle segment',
        timeout: 15000,
        checkForDisplayed: true,
      });
    } else if (!proSegmentVisible) {
      throw new Error(
        'Perps mode toggle not found (expected Lite pill or Pro segment)',
      );
    }
    // else: only Pro pill visible → already in Pro; continue to assert Pro view.

    // iOS XCUITest often reports the BottomSheet container / cards as
    // isDisplayed=false while the sheet is on screen. Detect via isExisting
    // (title or Pro option), not isDisplayed.
    if (await this.isModeSelectionSheetPresent(10000)) {
      await this.confirmProModeOnSelectionSheet();
    }

    // Root View often reports isDisplayed=false on iOS while Pro UI is on screen.
    await this.waitForProViewReady(15000);
  }

  /**
   * True when the mode chooser is in the hierarchy (even if isDisplayed=false).
   */
  private async isModeSelectionSheetPresent(
    timeoutMs: number,
  ): Promise<boolean> {
    try {
      await Assertions.expectElementToExist(this.modeSelectionProOption, {
        description: 'Pro mode selection option in hierarchy',
        timeout: timeoutMs,
      });
      return true;
    } catch {
      try {
        await Assertions.expectElementToExist(this.modeSelectionTitle, {
          description: 'Mode selection sheet title in hierarchy',
          timeout: 1500,
        });
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Selects Pro on the "Choose how you trade" sheet and waits for it to dismiss.
   * Avoid isDisplayed checks on iOS — use existence + coordinate/center tap.
   */
  private async confirmProModeOnSelectionSheet(): Promise<void> {
    await Assertions.expectElementToExist(this.modeSelectionProOption, {
      description: 'Pro mode selection option',
      timeout: 10000,
    });

    await Utilities.executeWithRetry(
      async () => {
        if (PlatformDetector.isIOS()) {
          await this.tapModeSelectionProOptionCenter();
        } else {
          await Gestures.waitAndTap(this.modeSelectionProOption, {
            elemDescription: 'Pro mode selection option',
            checkForDisplayed: false,
            checkEnabled: false,
            timeout: 10000,
          });
        }

        // Sheet dismiss removes Pro option from the hierarchy.
        await Assertions.expectElementToNotExist(this.modeSelectionProOption, {
          description: 'Pro mode option should dismiss with sheet',
          timeout: 5000,
        });
      },
      {
        interval: 1000,
        timeout: 25000,
        description: 'confirm Pro on mode selection sheet',
      },
    );
  }

  private async tapModeSelectionProOptionCenter(): Promise<void> {
    const el = await this.modeSelectionProOption;
    const native = el.unwrap();
    if (!(await native.isExisting())) {
      throw new Error('Pro mode selection option is not in the hierarchy');
    }

    // Prefer a center pointer tap — element.click() is unreliable on nested
    // ButtonBase cards under iOS BottomSheets. Fall back to click if geometry
    // is unavailable (isDisplayed=false can still expose a rect on XCUITest).
    try {
      const location = await native.getLocation();
      const size = await native.getSize();
      if (size.width >= 2 && size.height >= 2) {
        const x = Math.floor(location.x + size.width / 2);
        const y = Math.floor(location.y + size.height / 2);
        const drv = getDriver();
        await drv
          .action('pointer', { parameters: { pointerType: 'touch' } })
          .move({ duration: 0, x, y })
          .down({ button: 0 })
          .pause(100)
          .up({ button: 0 })
          .perform();
        return;
      }
    } catch {
      // Fall through to click.
    }

    await native.click();
  }

  // ── Readiness ──────────────────────────────────────────────────────────────

  async waitForProViewReady(timeout = 20000): Promise<void> {
    // Container is a layout View: XCUITest frequently keeps isDisplayed=false.
    await Assertions.expectElementToExist(this.container, {
      description: 'Perps Pro Market View container',
      timeout,
    });
    // Order-form control is a stronger "Pro entry ready" signal than the root.
    await Assertions.expectElementToExist(this.directionLong, {
      description: 'Pro order form Long direction',
      timeout,
    });
  }

  async waitForPositionsPanel(timeout = 20000): Promise<void> {
    await Assertions.expectElementToBeVisible(this.positionsPanel, {
      description: 'Pro positions panel',
      timeout,
    });
  }

  async waitForFeesReady(timeout = 30000): Promise<void> {
    await Assertions.expectElementToBeVisible(this.feesValue, {
      description: 'Pro order form fees value',
      timeout,
    });
  }

  // ── Order form actions ─────────────────────────────────────────────────────

  get scrollView(): Promise<AppiumElement> {
    return Matchers.getElementByID(PerpsProMarketViewSelectorsIDs.SCROLL_VIEW);
  }

  async selectDirection(direction: 'long' | 'short'): Promise<void> {
    const button =
      direction === 'long' ? this.directionLong : this.directionShort;
    await Gestures.waitAndTap(button, {
      elemDescription: `Pro order form direction ${direction}`,
      checkForDisplayed: true,
      timeout: 10000,
    });
  }

  /**
   * Dismisses the Android/iOS soft keyboard after Pro decimal-pad inputs.
   * Avoid tapping the chart: it is often absent from the hierarchy while the
   * order form is focused. On Android, fall back to BACK if still shown.
   * After typing size on iOS, prefer {@link tapSizeKeyboardDone} instead —
   * decimal pads have no return key and tapOutside is unreliable.
   */
  async dismissOrderFormKeyboard(): Promise<void> {
    await Gestures.hideKeyboard();
    if (!PlatformDetector.isAndroid()) {
      return;
    }
    const drv = getDriver();
    if (!drv) {
      return;
    }
    try {
      if (await drv.isKeyboardShown()) {
        await drv.pressKeyCode(4); // KEYCODE_BACK
      }
    } catch {
      // Keyboard already dismissed or BACK not applicable
    }
  }

  /**
   * Taps the size InputAccessoryView Done control (`Keyboard.dismiss`).
   */
  async tapSizeKeyboardDone(): Promise<void> {
    await Gestures.waitAndTap(
      Matchers.getElementByID(
        `${PerpsProOrderFormSelectorsIDs.KEYBOARD_DONE}-${PerpsProOrderFormSelectorsIDs.SIZE_INPUT}`,
      ),
      {
        elemDescription: 'Pro size keyboard Done',
        checkForDisplayed: false,
        timeout: 10000,
      },
    );
  }

  async enterSize(size: string): Promise<void> {
    // Tap the a11y ButtonBase (SIZE_FIELD). Nested SIZE_INPUT is often absent
    // from the iOS accessibility tree while this field owns focus.
    await Gestures.waitAndTap(this.sizeField, {
      elemDescription: 'Pro order form size field',
      checkForDisplayed: false,
      timeout: 15000,
    });

    if (PlatformDetector.isIOS()) {
      await Gestures.typeViaIosKeyboard(size, { numberPad: true });
      await this.tapSizeKeyboardDone();
      return;
    }

    await Assertions.expectElementToExist(this.sizeInput, {
      description: 'Pro order form size input after field focus',
      timeout: 10000,
    });
    await Gestures.typeText(this.sizeInput, size, {
      elemDescription: 'Pro order form size value',
      clearFirst: true,
      hideKeyboard: false,
    });
    await this.dismissOrderFormKeyboard();
  }

  async tapOrderTypeButton(): Promise<void> {
    await this.dismissOrderFormKeyboard();
    await Gestures.waitAndTap(this.orderTypeButton, {
      elemDescription: 'Pro order type selector',
      checkForDisplayed: true,
      timeout: 15000,
    });
  }

  async selectLimitOrderType(): Promise<void> {
    await Gestures.waitAndTap(Matchers.getElementByText('Limit'), {
      elemDescription: 'Select Limit order type',
      checkForDisplayed: true,
      timeout: 10000,
    });
    // Wait for the Limit row to mount (Mid chip / empty-field pressable).
    await Assertions.expectElementToBeVisible(this.limitPriceField, {
      description: 'Pro limit price field after selecting Limit',
      timeout: 15000,
    });
  }

  async tapMidPriceButton(): Promise<void> {
    await this.scrollUntilVisible(
      this.midPriceButton,
      'Pro order form mid price preset',
    );
    await Gestures.waitAndTap(this.midPriceButton, {
      elemDescription: 'Pro order form mid price preset',
      checkForDisplayed: true,
      timeout: 10000,
    });
    await this.dismissOrderFormKeyboard();
  }

  async enterLimitPrice(price: string): Promise<void> {
    // Empty inline Limit fields hide the native TextInput from TalkBack
    // (`importantForAccessibility="no"` + zero-size wrapper). Tapping `-field`
    // alone is flaky on CI Android — focus often never flips `isInlineActive`.
    // Mid commits a value through React state, which mounts the TextInput.
    await this.scrollUntilVisible(
      this.midPriceButton,
      'Pro order form mid price preset',
    );
    await Gestures.waitAndTap(this.midPriceButton, {
      elemDescription: 'Pro order form mid price preset (reveal limit input)',
      checkForDisplayed: true,
      timeout: 10000,
    });
    await Assertions.expectElementToBeVisible(this.limitPriceInput, {
      description: 'Pro limit price TextInput after Mid preset',
      timeout: 15000,
    });
    // Focus before clear/replace. Clearing an unfocused Mid value drops
    // `value.length` to 0 with `isFocused=false`, which collapses the inline
    // input out of the a11y tree and makes elementClear/elementSendKeys fail.
    await Gestures.waitAndTap(this.limitPriceInput, {
      elemDescription: 'Pro order form limit price input (keep inline active)',
      checkForDisplayed: true,
      timeout: 10000,
    });
    await Gestures.replaceText(this.limitPriceInput, price, {
      elemDescription: 'Pro order form limit price value',
      timeout: 15000,
    });
    await this.dismissOrderFormKeyboard();
  }

  async tapTpslSection(): Promise<void> {
    await this.scrollUntilVisible(
      this.tpslButton,
      'Pro order form TPSL section',
    );
    await Gestures.waitAndTap(this.tpslButton, {
      elemDescription: 'Pro order form TPSL section',
      checkForDisplayed: true,
      timeout: 10000,
    });
  }

  async tapPlaceOrderButton(): Promise<void> {
    await this.dismissOrderFormKeyboard();
    // Ensure Place order is on-screen (form can sit under the keypad area).
    if (!(await Utilities.isElementVisible(this.placeOrderButton, 2000))) {
      await Gestures.swipe(this.scrollView, 'up', {
        speed: 'fast',
        percentage: 0.7,
        elemDescription: 'Swipe Pro market view to Place order',
      });
    }
    // WDIO waitForEnabled often passes while RN still has isDisabled=true.
    // waitForInteractive polls native enabled/clickable until stably tappable.
    await Gestures.waitAndTap(this.placeOrderButton, {
      timeout: 45000,
      elemDescription: 'Pro place order button',
      checkForDisplayed: true,
      checkEnabled: true,
      waitForInteractive: true,
      enabledStableReads: 6,
      postEnabledSettleMs: 500,
      checkStability: true,
      delay: 300,
    });
  }

  /**
   * Android often omits off-screen ScrollView children from the hierarchy, so
   * scrollToElement cannot find the tab. Swipe until it appears, then tap.
   * Same Gestures.swipe pattern as PerpsMarketDetailsView.scrollToBottom.
   */
  private async scrollUntilVisible(
    target: Promise<AppiumElement>,
    elemDescription: string,
    timeout = 45000,
  ): Promise<void> {
    await this.dismissOrderFormKeyboard();
    const scrollView = await this.scrollView;
    await Utilities.executeWithRetry(
      async () => {
        if (await Utilities.isElementVisible(target, 1500)) {
          return;
        }
        await Gestures.swipe(scrollView, 'up', {
          speed: 'fast',
          percentage: 0.7,
          elemDescription: `Swipe Pro market view toward ${elemDescription}`,
        });
        if (!(await Utilities.isElementVisible(target, 1500))) {
          throw new Error(`${elemDescription} not visible after swipe`);
        }
      },
      {
        interval: 400,
        timeout,
        description: `scroll until ${elemDescription} visible`,
      },
    );
    // Order/position rows often land in the bottom 15% after the first swipe;
    // nudge fully on-screen so Android exposes the row testID for taps/asserts.
    await Gestures.scrollIntoViewFullyVisible(target, {
      direction: 'up',
      scrollableElement: scrollView,
      maxScrolls: 6,
      percent: 0.7,
    });
  }

  private async swipeUntilVisibleThenTap(
    target: Promise<AppiumElement>,
    elemDescription: string,
  ): Promise<void> {
    await this.scrollUntilVisible(target, elemDescription);
    await Gestures.waitAndTap(target, {
      elemDescription,
      checkForDisplayed: true,
      timeout: 5000,
    });
  }

  // ── Position panel actions ─────────────────────────────────────────────────

  async waitForPositionRow(symbol: string, timeout = 60000): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        await this.tapPositionsTab();
        await this.scrollUntilVisible(
          this.positionRow(symbol),
          `Pro position row for ${symbol}`,
          8000,
        );
        await Assertions.expectElementToBeVisible(this.positionRow(symbol), {
          description: `Pro position row for ${symbol}`,
          timeout: 3000,
        });
      },
      { interval: 1000, timeout },
    );
  }

  async expectPositionRowVisible(symbol: string): Promise<void> {
    // After Orders-tab verification the panel may be off-screen again (form
    // re-layout / toast). Scroll to the Positions tab, select it, then scroll
    // until the position row itself is on screen.
    await this.tapPositionsTab();
    await this.scrollUntilVisible(
      this.positionRow(symbol),
      `Pro position row for ${symbol}`,
    );
    await Assertions.expectElementToBeVisible(this.positionRow(symbol), {
      description: `Pro position row for ${symbol}`,
      timeout: 10000,
    });
  }

  async expectPositionRowNotVisible(symbol: string): Promise<void> {
    await this.tapPositionsTab();
    await this.scrollUntilVisible(
      this.positionsPanel,
      'Pro positions panel list',
    );
    await Assertions.expectElementToNotBeVisible(this.positionRow(symbol), {
      description: `Pro position row for ${symbol} should not be visible`,
      timeout: 10000,
    });
  }

  /**
   * Taps the Close (X) button directly on the position row card.
   * Navigates to the Close Position screen.
   */
  async tapPositionCloseButton(symbol: string): Promise<void> {
    await this.tapPositionsTab();
    await this.scrollUntilVisible(
      this.positionRow(symbol),
      `Pro position row for ${symbol}`,
    );
    await Gestures.waitAndTap(
      Matchers.getElementByID(PerpsProMarketViewSelectorsIDs.POSITION_CLOSE),
      {
        elemDescription: `Close button on ${symbol} position row`,
        checkForDisplayed: true,
        timeout: 10000,
      },
    );
  }

  /**
   * Taps Edit TP/SL on the position row to open the Auto close sheet.
   */
  async tapPositionEditTpslButton(symbol: string): Promise<void> {
    await this.tapPositionsTab();
    await this.scrollUntilVisible(
      this.positionRow(symbol),
      `Pro position row for ${symbol}`,
    );
    await Gestures.waitAndTap(
      Matchers.getElementByID(
        PerpsProMarketViewSelectorsIDs.POSITION_EDIT_TPSL,
      ),
      {
        elemDescription: `Edit TP/SL button on ${symbol} position row`,
        checkForDisplayed: true,
        timeout: 10000,
      },
    );
  }

  // ── Orders tab actions ─────────────────────────────────────────────────────

  async tapOrdersTab(): Promise<void> {
    await this.swipeUntilVisibleThenTap(
      this.ordersTab,
      'Orders tab in Pro positions panel',
    );
  }

  async tapPositionsTab(): Promise<void> {
    await this.swipeUntilVisibleThenTap(
      this.positionsTab,
      'Positions tab in Pro positions panel',
    );
  }

  async waitForOrderRow(
    symbol: string,
    index: number,
    timeout = 20000,
  ): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        await this.tapOrdersTab();
        await this.scrollUntilVisible(
          this.orderRow(symbol, index),
          `Pro order row ${symbol}[${index}]`,
          8000,
        );
        await Assertions.expectElementToBeVisible(
          this.orderRow(symbol, index),
          {
            description: `Pro order row ${symbol}[${index}]`,
            timeout: 3000,
          },
        );
      },
      { interval: 1000, timeout },
    );
  }

  async expectOrderRowVisible(symbol: string, index: number): Promise<void> {
    await this.tapOrdersTab();
    await this.scrollUntilVisible(
      this.orderRow(symbol, index),
      `Pro order row ${symbol}[${index}]`,
    );
    await Assertions.expectElementToBeVisible(this.orderRow(symbol, index), {
      description: `Pro order row ${symbol}[${index}]`,
      timeout: 10000,
    });
  }

  async expectOrderRowNotVisible(symbol: string, index: number): Promise<void> {
    await this.tapOrdersTab();
    await this.scrollUntilVisible(
      this.positionsPanel,
      'Pro positions panel orders list',
    );
    await Assertions.expectElementToNotBeVisible(this.orderRow(symbol, index), {
      description: `Pro order row ${symbol}[${index}] should not be visible`,
      timeout: 10000,
    });
  }

  /**
   * Taps the inline Cancel button on the first ORDER_CANCEL element in the
   * orders list. For single-order scenarios this unambiguously cancels the order.
   */
  async tapOrderCancelButton(): Promise<void> {
    const cancelButton = Matchers.getElementByID(
      PerpsProMarketViewSelectorsIDs.ORDER_CANCEL,
    );
    await this.scrollUntilVisible(cancelButton, 'Pro order cancel button');
    await Gestures.waitAndTap(cancelButton, {
      elemDescription: 'Pro order cancel button',
      checkForDisplayed: true,
      timeout: 10000,
    });
  }
}

export default new PerpsProMarketView();
