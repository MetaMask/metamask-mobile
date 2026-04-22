import {
  PerpsGeneralSelectorsIDs,
  PerpsOrderViewSelectorsIDs,
  PerpsMarketListViewSelectorsIDs,
  PerpsClosePositionViewSelectorsIDs,
  PerpsPositionDetailsViewSelectorsIDs,
  PerpsMarketDetailsViewSelectorsIDs,
  getPerpsTPSLViewSelector,
} from '../../../app/components/UI/Perps/Perps.testIds';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import Assertions from '../../framework/Assertions';
import Utilities from '../../framework/Utilities';
import { waitForStableEnabledIOS } from './waitForStableEnabledIOS';
import PerpsHomeView from './PerpsHomeView';
import PerpsMarketListView from './PerpsMarketListView';

/** Portfolio: limit order primary (`formatOrderLabel`) + position primary (`{symbol} {n}x {side}`). */
export interface PerpsPortfolioLimitFlowExpectOptions {
  symbol: string;
  direction: 'long' | 'short';
  /** Override order card label before fill (default `Limit {direction}`). */
  orderLabel?: string;
}

class PerpsView {
  get closePositionButton() {
    return Matchers.getElementByID(
      PerpsMarketDetailsViewSelectorsIDs.CLOSE_BUTTON,
    );
  }

  getPositionItem(
    symbol: string,
    leverageX: number,
    direction: 'long' | 'short',
    index = 0,
  ): DetoxElement {
    return Matchers.getElementByID(
      new RegExp(
        `^perps-positions-item-${symbol}-${leverageX}x-${direction}-${index}$`,
      ),
    );
  }

  /**
   * Same testID pattern as {@link getPositionItem} but matches any leverage (`Nx`).
   * Prefer this when leverage comes from the live order form (E2E mock uses `params.leverage || 1`).
   */
  getPositionItemAnyLeverage(
    symbol: string,
    direction: 'long' | 'short',
    index = 0,
  ): DetoxElement {
    const escapedSymbol = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return Matchers.getElementByID(
      new RegExp(
        `^perps-positions-item-${escapedSymbol}-\\d+x-${direction}-${index}$`,
      ),
    );
  }

  get setTpslButton() {
    return Matchers.getElementByID(
      PerpsGeneralSelectorsIDs.BOTTOM_SHEET_FOOTER_BUTTON,
    );
  }

  // "Edit TP/SL" button visible on position details
  get editTpslButton(): DetoxElement {
    return Matchers.getElementByText('Edit TP/SL');
  }

  get closePositionBottomSheetButton(): DetoxElement {
    return Matchers.getElementByID(
      PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
    );
  }

  get closePositionBottomSheet() {
    return Matchers.getElementByID(
      PerpsPositionDetailsViewSelectorsIDs.CLOSE_POSITION_BOTTOMSHEET,
    );
  }

  get placeOrderButton() {
    return Matchers.getElementByID(
      PerpsOrderViewSelectorsIDs.PLACE_ORDER_BUTTON,
    );
  }

  get backButtonPositionSheet() {
    return Matchers.getElementByID(
      PerpsMarketListViewSelectorsIDs.BACK_HEADER_BUTTON,
    );
  }

  get orderSuccessToastDismissButton() {
    return Matchers.getElementByID(
      PerpsGeneralSelectorsIDs.ORDER_SUCCESS_TOAST_DISMISS_BUTTON,
    );
  }

  get toastDismissButton() {
    return Matchers.getElementByText('Dismiss');
  }

  /** PerpsTabView main scroll (embedded tab). Not mounted on Perps home (homepage redesign). */
  get anchor(): DetoxElement {
    return Matchers.getElementByID('perps-tab-scroll-view');
  }

  /** Perps home header — use as swipe target when {@link anchor} is absent. */
  get perpsHomeHeader(): DetoxElement {
    return Matchers.getElementByID('perps-home');
  }

  // Orders section on the Perps main tab
  get ordersSectionTitle(): DetoxElement {
    return Matchers.getElementByText('Orders');
  }

  get anyOrderCardOnTab(): DetoxElement {
    // PerpsCard has no specific testID for orders; assert by the presence of the title and any text matching limit label
    return Matchers.getElementByText('Limit');
  }

  async expectOpenOrdersOnTab(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.ordersSectionTitle, {
      description: 'Perps tab shows Open Orders section',
    });
    await Assertions.expectElementToBeVisible(this.anyOrderCardOnTab, {
      description: 'An order card is visible on Perps tab',
    });
  }

  /**
   * Open limit order visible on portfolio/home (`formatOrderLabel` / PerpsCard).
   */
  async expectLimitOrderVisibleOnPortfolio(
    options: PerpsPortfolioLimitFlowExpectOptions,
  ): Promise<void> {
    const { symbol, direction } = options;
    const orderLabel = options.orderLabel ?? `Limit ${direction}`;
    await Utilities.executeWithRetry(
      async () => {
        await Assertions.expectTextDisplayed(orderLabel, {
          description: `${orderLabel} order visible on Perps portfolio (${symbol})`,
          timeout: 5000,
        });
      },
      { interval: 1000, timeout: 30000 },
    );
  }

  /**
   * After fill: order label gone and position row matches `{symbol} {n}x {direction}` (PerpsCard).
   */
  async expectPositionRowAfterLimitOrderFilled(
    options: PerpsPortfolioLimitFlowExpectOptions,
  ): Promise<void> {
    const { symbol, direction } = options;
    const orderLabel = options.orderLabel ?? `Limit ${direction}`;
    const escapedSymbol = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const positionPrimaryLine = new RegExp(
      `${escapedSymbol} \\d+x ${direction}`,
    );
    await Utilities.executeWithRetry(
      async () => {
        await Assertions.expectTextNotDisplayed(orderLabel, {
          description: `Open order "${orderLabel}" cleared after fill (${symbol})`,
          timeout: 5000,
        });
        await Assertions.expectElementToBeVisible(
          Matchers.getElementByText(positionPrimaryLine),
          {
            description: `${symbol} position row visible (${direction}, any leverage)`,
            timeout: 5000,
          },
        );
      },
      { interval: 1000, timeout: 30000 },
    );
  }

  getTakeProfitPercentageButton(percentage: number) {
    // Support legacy tests passing index (1..4) by mapping to actual ROE%
    // TP quick buttons: [10, 25, 50, 100]
    const mapped = [0, 10, 25, 50, 100][percentage] || percentage;
    return Matchers.getElementByID(
      getPerpsTPSLViewSelector.takeProfitPercentageButton(mapped),
    );
  }

  getStopLossPercentageButton(percentage: number) {
    // Support legacy tests passing index (1..4) by mapping to actual ROE% (loss magnitudes)
    // SL quick buttons: [-5, -10, -25, -50]
    const mapped = [0, -5, -10, -25, -50][percentage] || percentage;
    return Matchers.getElementByID(
      getPerpsTPSLViewSelector.stopLossPercentageButton(mapped),
    );
  }

  async expectPosition(
    symbol: string,
    leverageX: number,
    direction: 'long' | 'short',
    index = 0,
  ) {
    const el = this.getPositionItem(symbol, leverageX, direction, index);
    await Assertions.expectElementToBeVisible(el, {
      description: `Expect ${symbol} ${leverageX}x ${direction} at index ${index}`,
    });
  }

  async expectPerpsTabPosition(
    symbol: string,
    leverageX: number,
    direction: 'long' | 'short',
    index = 0,
  ) {
    const el = this.getPositionItem(symbol, leverageX, direction, index);
    await Assertions.expectElementToBeVisible(el, {
      description: `Expect Perps tab position: ${symbol} ${leverageX}x ${direction} at index ${index}`,
    });
  }

  // Tap a position in the Perps tab by its testID
  async tapPerpsTabPosition(
    symbol: string,
    leverageX: number,
    direction: 'long' | 'short',
    index = 0,
  ) {
    const el = this.getPositionItem(symbol, leverageX, direction, index);
    await Gestures.waitAndTap(el, {
      elemDescription: `Tap Perps tab position: ${symbol} ${leverageX}x ${direction} at index ${index}`,
    });
  }

  /**
   * Scrolls the Perps portfolio area down. Uses tab ScrollView when present; otherwise Perps home
   * (homepage redesign has no `perps-tab-scroll-view`).
   */
  async scrollDownOnPerpsTab(times = 1) {
    for (let i = 0; i < times; i++) {
      const tabScrollVisible = await Utilities.isElementVisible(
        this.anchor,
        1000,
      );
      const swipeTarget = tabScrollVisible ? this.anchor : this.perpsHomeHeader;
      await Gestures.swipe(swipeTarget, 'up', {
        speed: 'fast',
        percentage: 0.7,
        elemDescription: tabScrollVisible
          ? 'Perps tab scroll down'
          : 'Perps home scroll down',
      });
    }
  }

  // Ensure a position card is visible on the Perps tab. Performs best-effort scrolls.
  async ensurePerpsTabPositionVisible(
    symbol: string,
    leverageX: number,
    direction: 'long' | 'short',
    index = 0,
  ) {
    for (let i = 0; i < 6; i++) {
      const el = this.getPositionItem(symbol, leverageX, direction, index);
      const isVisible = await Utilities.isElementVisible(el, 750);
      if (isVisible) {
        return;
      }
      await this.scrollDownOnPerpsTab(1);
    }
    // Final assert to avoid masking regressions
    const finalEl = this.getPositionItem(symbol, leverageX, direction, index);
    await Assertions.expectElementToBeVisible(finalEl, {
      description: `Perps tab position should be visible: ${symbol} ${leverageX}x ${direction} at index ${index}`,
      timeout: 5000,
    });
  }

  async tapEditTpslButton() {
    await Gestures.waitAndTap(this.editTpslButton, {
      elemDescription: 'Tap Edit TP/SL button',
    });
  }

  async tapClosePositionButton() {
    await Gestures.waitAndTap(this.closePositionButton, {
      elemDescription: 'Close position button',
      checkStability: true,
      timeout: 15000,
    });
  }

  async tapConfirmClosePositionButton() {
    await Gestures.waitAndTap(this.closePositionButton, {
      elemDescription: 'Confirm close position button',
    });
  }

  async tapTakeProfitPercentageButton(percentage: number) {
    const button = this.getTakeProfitPercentageButton(percentage);
    await Gestures.waitAndTap(button);
  }

  async tapStopLossPercentageButton(percentage: number) {
    const button = this.getStopLossPercentageButton(percentage);
    await Gestures.waitAndTap(button);
  }

  async tapSetTpslButton() {
    await Gestures.waitAndTap(this.setTpslButton);
  }

  async tapPlaceOrderButton() {
    const el = this.placeOrderButton as DetoxElement;
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
  }

  async tapOrderSuccessToastDismissButton() {
    await Gestures.waitAndTap(this.orderSuccessToastDismissButton);
  }

  async dismissToast(): Promise<void> {
    const button = this.toastDismissButton;
    await Assertions.expectElementToBeVisible(button, {
      description: 'Toast Dismiss button visible',
      timeout: 3000,
    });
    await Gestures.waitAndTap(button, {
      elemDescription: 'Tap toast close',
      delay: 100,
    });
  }

  async tapClosePositionBottomSheetButton() {
    // Wait robustly until the confirm button appears (sheet open + layout ready)
    await Utilities.waitUntil(
      async () =>
        await Utilities.isElementVisible(
          this.closePositionBottomSheetButton,
          400,
        ),
      { interval: 200, timeout: 7000 },
    );
    await Gestures.waitAndTap(this.closePositionBottomSheetButton, {
      elemDescription: 'Close position bottom sheet button',
      checkStability: true,
      timeout: 10000,
    });
  }

  // Generic scroll to bottom on Perps tab (positions list area)
  async scrollToBottom(times: number = 1) {
    await this.scrollDownOnPerpsTab(times);
  }

  async tapBackButtonPositionSheet() {
    await Gestures.waitAndTap(this.backButtonPositionSheet, {
      elemDescription: 'Back button position sheet',
    });
  }

  /**
   * After placing an order from market details (explore → market → order), return to Perps
   * portfolio home where open orders are listed. Uses market-details header back, then
   * market-list header back — not {@link PerpsHomeView.tapBackHomeButton} (that control only
   * exists on portfolio home and exits Perps toward wallet).
   */
  async navigateToPerpsPortfolioHomeFromMarketOrderFlow(): Promise<void> {
    await this.tapBackButtonPositionSheet();

    if (await Utilities.isElementVisible(PerpsHomeView.backHome, 3000)) {
      return;
    }

    if (
      await Utilities.isElementVisible(
        PerpsMarketListView.headerBackButton,
        3000,
      )
    ) {
      await PerpsMarketListView.tapHeaderBackToPortfolioHome();
      return;
    }

    if (
      await Utilities.isElementVisible(
        this.backButtonPositionSheet as DetoxElement,
        3000,
      )
    ) {
      await this.tapBackButtonPositionSheet();
      await PerpsMarketListView.tapHeaderBackToPortfolioHome();
      return;
    }

    throw new Error(
      'Could not reach Perps portfolio home: no market list back or market header back visible',
    );
  }

  /**
   * Retries until the positions list row for this market/direction is gone (e.g. after liquidation).
   * Uses {@link getPositionItemAnyLeverage} so leverage does not need to match a fixed mock value.
   */
  async expectPositionRowNotVisibleAnyLeverage(
    symbol: string,
    direction: 'long' | 'short',
    index = 0,
  ): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        await Assertions.expectElementToNotBeVisible(
          this.getPositionItemAnyLeverage(symbol, direction, index),
          {
            description: `Perps position row for ${symbol} ${direction} not visible after liquidation`,
            timeout: 3000,
          },
        );
      },
      {
        interval: 1000,
        timeout: 30000,
        description:
          'wait for perps position row to disappear after liquidation (any leverage)',
      },
    );
  }
}

export default new PerpsView();
