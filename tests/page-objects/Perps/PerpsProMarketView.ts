import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import Utilities from '../../framework/Utilities';
import { waitForStableEnabledIOS } from './waitForStableEnabledIOS';
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
   * Switches to Pro mode. Taps the Pro segment of the mode toggle and confirms
   * in the mode selection bottom sheet when it appears.
   */
  async switchToProMode(): Promise<void> {
    await Gestures.waitAndTap(this.proModeSegment, {
      elemDescription: 'Pro mode toggle segment',
      timeout: 15000,
      checkForDisplayed: true,
    });

    const sheetVisible = await Utilities.isElementVisible(
      this.modeSelectionSheet,
      3000,
    );
    if (sheetVisible) {
      await Gestures.waitAndTap(this.modeSelectionProOption, {
        elemDescription: 'Pro mode selection option',
        checkForDisplayed: true,
        timeout: 10000,
      });
    }

    await Assertions.expectElementToBeVisible(this.container, {
      description: 'Perps Pro Market View container',
      timeout: 15000,
    });
  }

  // ── Readiness ──────────────────────────────────────────────────────────────

  async waitForProViewReady(timeout = 20000): Promise<void> {
    await Assertions.expectElementToBeVisible(this.container, {
      description: 'Perps Pro Market View container',
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

  async selectDirection(direction: 'long' | 'short'): Promise<void> {
    const button =
      direction === 'long' ? this.directionLong : this.directionShort;
    await Gestures.waitAndTap(button, {
      elemDescription: `Pro order form direction ${direction}`,
      checkForDisplayed: true,
      timeout: 10000,
    });
  }

  async enterSize(size: string): Promise<void> {
    await Gestures.waitAndTap(this.sizeInput, {
      elemDescription: 'Pro order form size input',
      checkForDisplayed: true,
      timeout: 10000,
    });
    await Gestures.typeText(this.sizeInput, size, {
      elemDescription: 'Pro order form size value',
      clearFirst: true,
    });
  }

  async tapOrderTypeButton(): Promise<void> {
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
  }

  async tapMidPriceButton(): Promise<void> {
    await Gestures.waitAndTap(this.midPriceButton, {
      elemDescription: 'Pro order form mid price preset',
      checkForDisplayed: true,
      timeout: 10000,
    });
  }

  async tapTpslSection(): Promise<void> {
    await Gestures.waitAndTap(this.tpslButton, {
      elemDescription: 'Pro order form TPSL section',
      checkForDisplayed: true,
      timeout: 10000,
    });
  }

  async tapPlaceOrderButton(): Promise<void> {
    await Utilities.waitForReadyState(this.placeOrderButton, {
      checkStability: true,
      timeout: 8000,
      elemDescription: 'Pro place order button',
    });
    await waitForStableEnabledIOS(this.placeOrderButton, {
      timeout: 22000,
      pollIntervalMs: 120,
      consecutiveSuccess: 5,
    });
    await Gestures.waitAndTap(this.placeOrderButton, {
      timeout: 35000,
      elemDescription: 'Pro place order button',
      checkForDisplayed: true,
      checkEnabled: true,
      checkStability: true,
      delay: 1000,
    });
  }

  // ── Position panel actions ─────────────────────────────────────────────────

  async waitForPositionRow(symbol: string, timeout = 60000): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        await Assertions.expectElementToBeVisible(this.positionRow(symbol), {
          description: `Pro position row for ${symbol}`,
          timeout: 3000,
        });
      },
      { interval: 1000, timeout },
    );
  }

  async expectPositionRowVisible(symbol: string): Promise<void> {
    await Assertions.expectElementToBeVisible(this.positionRow(symbol), {
      description: `Pro position row for ${symbol}`,
      timeout: 10000,
    });
  }

  async expectPositionRowNotVisible(symbol: string): Promise<void> {
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
    await Gestures.waitAndTap(this.ordersTab, {
      elemDescription: 'Orders tab in Pro positions panel',
      checkForDisplayed: true,
      timeout: 10000,
    });
  }

  async waitForOrderRow(
    symbol: string,
    index: number,
    timeout = 20000,
  ): Promise<void> {
    await Assertions.expectElementToBeVisible(this.orderRow(symbol, index), {
      description: `Pro order row ${symbol}[${index}]`,
      timeout,
    });
  }

  async expectOrderRowVisible(symbol: string, index: number): Promise<void> {
    await Assertions.expectElementToBeVisible(this.orderRow(symbol, index), {
      description: `Pro order row ${symbol}[${index}]`,
      timeout: 10000,
    });
  }

  async expectOrderRowNotVisible(symbol: string, index: number): Promise<void> {
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
    await Gestures.waitAndTap(
      Matchers.getElementByID(PerpsProMarketViewSelectorsIDs.ORDER_CANCEL),
      {
        elemDescription: 'Pro order cancel button',
        checkForDisplayed: true,
        timeout: 10000,
      },
    );
  }
}

export default new PerpsProMarketView();
