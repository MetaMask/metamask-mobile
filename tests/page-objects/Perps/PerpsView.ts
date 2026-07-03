import {
  PerpsGeneralSelectorsIDs,
  PerpsOrderViewSelectorsIDs,
  PerpsMarketListViewSelectorsIDs,
  PerpsClosePositionViewSelectorsIDs,
  PerpsPositionDetailsViewSelectorsIDs,
  PerpsMarketDetailsViewSelectorsIDs,
  PerpsHomeViewSelectorsIDs,
  PerpsMarketHeaderSelectorsIDs,
  PerpsOrderHeaderSelectorsIDs,
  getPerpsTPSLViewSelector,
} from '../../../app/components/UI/Perps/Perps.testIds';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import Assertions from '../../framework/Assertions';
import Utilities from '../../framework/Utilities';
import { waitForStableEnabledIOS } from './waitForStableEnabledIOS';
import PerpsHomeView from './PerpsHomeView';
import PerpsMarketListView from './PerpsMarketListView';
import PerpsMarketDetailsView from './PerpsMarketDetailsView';
import {
  EncapsulatedElementType,
  FrameworkDetector,
  PlatformDetector,
  PlaywrightGestures,
  PlaywrightMatchers,
  sleep,
} from '../../framework';

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
  ): EncapsulatedElementType {
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
  ): EncapsulatedElementType {
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
  get editTpslButton(): EncapsulatedElementType {
    return Matchers.getElementByText('Edit TP/SL');
  }

  get closePositionBottomSheetButton(): EncapsulatedElementType {
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

  get anchor(): EncapsulatedElementType {
    return Matchers.getElementByID('perps-tab-scroll-view');
  }

  /** Perps home header — use as swipe target when {@link anchor} is absent. */
  get perpsHomeHeader(): EncapsulatedElementType {
    return Matchers.getElementByID('perps-home');
  }

  get perpsHomeAddFunds(): EncapsulatedElementType {
    return Matchers.getElementByID(PerpsHomeViewSelectorsIDs.ADD_FUNDS_BUTTON);
  }

  private getPortfolioPositionCard(index = 0): EncapsulatedElementType {
    return Matchers.getElementByID(
      `${PerpsHomeViewSelectorsIDs.POSITION_CARD}-${index}`,
    );
  }

  private getPortfolioOrderCard(index = 0): EncapsulatedElementType {
    return Matchers.getElementByID(
      `${PerpsHomeViewSelectorsIDs.ORDER_CARD}-${index}`,
    );
  }

  private getWalletHomePositionRow(symbol: string): EncapsulatedElementType {
    return Matchers.getElementByID(`perps-position-row-${symbol}`);
  }

  private getPositionPrimaryLine(
    symbol: string,
    direction: 'long' | 'short',
  ): EncapsulatedElementType {
    const escapedSymbol = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return Matchers.getElementByText(
      new RegExp(`${escapedSymbol} \\d+x ${direction}`),
    );
  }

  // Orders section on the Perps main tab
  get ordersSectionTitle(): EncapsulatedElementType {
    return Matchers.getElementByText('Orders');
  }

  get anyOrderCardOnTab(): EncapsulatedElementType {
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

  private async scrollLimitOrderIntoViewOnPortfolio(
    orderLabel: string,
  ): Promise<void> {
    const orderCard = this.getPortfolioOrderCard(0);
    if (await Utilities.isElementVisible(orderCard, 750)) {
      return;
    }

    const scrollView = Matchers.scrollContainer(
      PerpsHomeViewSelectorsIDs.SCROLL_CONTENT,
    );
    const orderElement = Matchers.getElementByText(orderLabel);

    try {
      await Gestures.scrollToElement(orderElement, scrollView, {
        direction: 'up',
        scrollAmount: 150,
        timeout: 5000,
        elemDescription: `scrollToElement(up) for ${orderLabel} on Perps portfolio`,
      });
    } catch {
      await this.scrollDownOnPerpsTab(1);
    }
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
        await this.scrollLimitOrderIntoViewOnPortfolio(orderLabel);

        const orderCard = this.getPortfolioOrderCard(0);
        if (await Utilities.isElementVisible(orderCard, 1500)) {
          await Assertions.expectElementToBeVisible(orderCard, {
            description: `${orderLabel} order card on Perps portfolio (${symbol})`,
            timeout: 3000,
          });
          return;
        }

        await Assertions.expectTextDisplayed(orderLabel, {
          description: `${orderLabel} order visible on Perps portfolio (${symbol})`,
          timeout: 5000,
        });
      },
      { interval: 1000, timeout: 60000 },
    );
  }

  /**
   * Asserts the open limit order label is no longer shown on Perps portfolio/home.
   */
  async expectLimitOrderNotVisibleOnPortfolio(
    options: PerpsPortfolioLimitFlowExpectOptions,
  ): Promise<void> {
    const { symbol, direction } = options;
    const orderLabel = options.orderLabel ?? `Limit ${direction}`;
    await Utilities.executeWithRetry(
      async () => {
        await Assertions.expectTextNotDisplayed(orderLabel, {
          description: `${orderLabel} order cleared from Perps portfolio (${symbol})`,
          timeout: 5000,
        });
      },
      { interval: 1000, timeout: 30000 },
    );
  }

  /**
   * Taps an open limit order card on Perps portfolio/home to open order details.
   */
  async tapLimitOrderOnPortfolio(
    options: PerpsPortfolioLimitFlowExpectOptions,
  ): Promise<void> {
    const orderLabel = options.orderLabel ?? `Limit ${options.direction}`;
    const orderCard = Matchers.getElementByText(orderLabel);
    await Gestures.waitAndTap(orderCard, {
      elemDescription: `Tap ${orderLabel} order on Perps portfolio`,
      timeout: 15000,
    });
  }

  /**
   * After fill: order label gone and position row matches `{symbol} {n}x {direction}` (PerpsCard).
   */
  async expectPositionRowAfterLimitOrderFilled(
    options: PerpsPortfolioLimitFlowExpectOptions,
  ): Promise<void> {
    const { symbol, direction } = options;
    const orderLabel = options.orderLabel ?? `Limit ${direction}`;
    const positionLocators: EncapsulatedElementType[] = [
      this.getPortfolioPositionCard(0),
      this.getWalletHomePositionRow(symbol),
      this.getPositionPrimaryLine(symbol, direction),
    ];
    await Utilities.executeWithRetry(
      async () => {
        await Assertions.expectTextNotDisplayed(orderLabel, {
          description: `Open order "${orderLabel}" cleared after fill (${symbol})`,
          timeout: 5000,
        });

        let positionVisible = false;
        for (const locator of positionLocators) {
          try {
            await Assertions.expectElementToBeVisible(locator, {
              description: `${symbol} position row visible (${direction})`,
              timeout: 3000,
            });
            positionVisible = true;
            break;
          } catch {
            // Try the next portfolio layout (Perps home vs wallet homepage).
          }
        }

        if (!positionVisible) {
          throw new Error(
            `No position row found for ${symbol} ${direction} after limit fill`,
          );
        }
      },
      { interval: 1000, timeout: 60000 },
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
    await Utilities.waitUntil(
      async () => {
        if (
          await Utilities.isElementVisible(
            this.closePositionBottomSheetButton,
            400,
          )
        ) {
          return true;
        }

        if (await Utilities.isElementVisible(this.closePositionButton, 400)) {
          await Gestures.waitAndTap(this.closePositionButton, {
            elemDescription: 'Close position button',
            checkStability: true,
            timeout: 5000,
          });
        }

        return Utilities.isElementVisible(
          this.closePositionBottomSheetButton,
          800,
        );
      },
      {
        interval: 500,
        timeout: 15000,
      },
    );
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

  /** Perps portfolio home (orders/positions feed), not market details or explore list. */
  async isOnPerpsPortfolioHome(timeout = 2000): Promise<boolean> {
    if (FrameworkDetector.isAppium()) {
      const portfolioMarkers = [
        'perps-home',
        PerpsHomeViewSelectorsIDs.BACK_HOME_BUTTON,
        PerpsHomeViewSelectorsIDs.ADD_FUNDS_BUTTON,
      ];

      for (const testId of portfolioMarkers) {
        try {
          const el = await PlaywrightMatchers.getElementById(testId, {
            exact: true,
          });
          await el.unwrap().waitForDisplayed({ timeout });
          return true;
        } catch {
          // Try next marker.
        }
      }

      if (PlatformDetector.isIOS()) {
        return this.isIosElementVisibleByXPath(
          "//*[@type='XCUIElementTypeButton' and (@name='Add funds' or @label='Add funds')]",
          timeout,
        );
      }

      return false;
    }

    const portfolioMarkers: EncapsulatedElementType[] = [
      this.perpsHomeHeader,
      PerpsHomeView.backHome,
      this.perpsHomeAddFunds,
    ];

    for (const marker of portfolioMarkers) {
      if (await Utilities.isElementVisible(marker, timeout)) {
        return true;
      }
    }

    return false;
  }

  private isIosAppium(): boolean {
    return FrameworkDetector.isAppium() && PlatformDetector.isIOS();
  }

  private get iosHeaderBackButtonXPath(): string {
    return [
      "//*[@type='XCUIElementTypeButton' and (",
      "@name='Back' or @label='Back' or contains(@name,'Back') or ",
      "contains(@label,'Back') or contains(@name,'arrow-left') or ",
      "contains(@label,'arrow-left') or contains(@name,'arrow.left') or ",
      "contains(@label,'arrow.left') or contains(@name,'ArrowLeft') or ",
      "contains(@label,'ArrowLeft')",
      ')]',
    ].join('');
  }

  private async isIosElementVisibleByXPath(
    xpath: string,
    timeout = 2000,
  ): Promise<boolean> {
    if (!this.isIosAppium()) {
      return false;
    }

    try {
      const el = await PlaywrightMatchers.getElementByXPath(xpath, {
        lastElement: false,
      });
      await el.unwrap().waitForDisplayed({ timeout });
      return true;
    } catch {
      return false;
    }
  }

  private async isIosHeaderBackVisible(timeout = 2000): Promise<boolean> {
    return this.isIosElementVisibleByXPath(
      this.iosHeaderBackButtonXPath,
      timeout,
    );
  }

  private async tapIosHeaderBackButton(): Promise<boolean> {
    if (!this.isIosAppium()) {
      return false;
    }

    try {
      const backButton = await PlaywrightMatchers.getElementByXPath(
        this.iosHeaderBackButtonXPath,
        { lastElement: false },
      );

      await PlaywrightGestures.waitAndTap(backButton, {
        checkForEnabled: false,
        timeout: 10000,
      });

      return true;
    } catch {
      return false;
    }
  }

  private async isMarketDetailsBackVisible(timeout = 2000): Promise<boolean> {
    return this.isTestIdVisible(
      PerpsMarketHeaderSelectorsIDs.BACK_BUTTON,
      timeout,
    );
  }

  private async isTestIdVisible(
    testId: string,
    timeout = 2000,
  ): Promise<boolean> {
    if (FrameworkDetector.isAppium()) {
      try {
        const el = await PlaywrightMatchers.getElementById(testId, {
          exact: true,
        });
        await el.unwrap().waitForDisplayed({ timeout });
        return true;
      } catch {
        return false;
      }
    }

    return Utilities.isElementVisible(Matchers.getElementByID(testId), timeout);
  }

  private async isMarketOrderFlowNavigationTargetVisible(
    marketListBackTestId: string,
    timeout = 500,
  ): Promise<boolean> {
    if (await this.isOnPerpsPortfolioHome(timeout)) {
      return true;
    }
    if (await this.isMarketDetailsBackVisible(timeout)) {
      return true;
    }
    if (await this.isTestIdVisible(marketListBackTestId, timeout)) {
      return true;
    }
    if (
      await this.isTestIdVisible(
        PerpsOrderHeaderSelectorsIDs.BACK_BUTTON,
        timeout,
      )
    ) {
      return true;
    }

    return this.isIosHeaderBackVisible(timeout);
  }

  private async waitForMarketOrderFlowNavigationTarget(
    marketListBackTestId: string,
    timeout = 30000,
  ): Promise<void> {
    await Utilities.waitUntil(
      async () =>
        this.isMarketOrderFlowNavigationTargetVisible(
          marketListBackTestId,
          500,
        ),
      {
        interval: 500,
        timeout,
      },
    );
  }

  private async tapMarketOrderFlowBackButton(
    marketListBackTestId: string,
  ): Promise<boolean> {
    if (
      await this.isTestIdVisible(PerpsOrderHeaderSelectorsIDs.BACK_BUTTON, 1000)
    ) {
      await Gestures.waitAndTap(
        Matchers.getElementByID(PerpsOrderHeaderSelectorsIDs.BACK_BUTTON),
        {
          elemDescription: 'Perps order header back (to market details)',
          timeout: 15000,
        },
      );
      return true;
    }

    if (await this.isMarketDetailsBackVisible(1000)) {
      await PerpsMarketDetailsView.tapBackButton();
      return true;
    }

    if (await this.isTestIdVisible(marketListBackTestId, 1000)) {
      await PerpsMarketListView.tapHeaderBackToPortfolioHome();
      return true;
    }

    return this.tapIosHeaderBackButton();
  }

  private async navigateToPerpsPortfolioHomeFromMarketOrderFlowAppium(
    marketListBackTestId: string,
  ): Promise<void> {
    await this.waitForMarketOrderFlowNavigationTarget(
      marketListBackTestId,
      30000,
    );

    for (let attempt = 0; attempt < 4; attempt++) {
      if (await this.isOnPerpsPortfolioHome(1000)) {
        return;
      }

      const didTapBack =
        await this.tapMarketOrderFlowBackButton(marketListBackTestId);
      if (!didTapBack) {
        break;
      }

      await sleep(700);

      try {
        await this.waitForMarketOrderFlowNavigationTarget(
          marketListBackTestId,
          10000,
        );
      } catch {
        // Let the next attempt decide whether we reached home or have no path.
      }
    }

    if (await this.isOnPerpsPortfolioHome(1000)) {
      return;
    }

    throw new Error(
      'Could not reach Perps portfolio home: no market list back or market header back visible',
    );
  }

  /**
   * After placing an order from market details (explore → market → order), return to Perps
   * portfolio home where open orders are listed. Uses market-details header back, then
   * market-list header back — not {@link PerpsHomeView.tapBackHomeButton} (that control only
   * exists on portfolio home and exits Perps toward wallet).
   */
  async navigateToPerpsPortfolioHomeFromMarketOrderFlow(): Promise<void> {
    const marketListBackTestId = `${PerpsMarketListViewSelectorsIDs.CLOSE_BUTTON}-back-button`;

    if (FrameworkDetector.isAppium()) {
      await this.navigateToPerpsPortfolioHomeFromMarketOrderFlowAppium(
        marketListBackTestId,
      );
      return;
    }

    await this.waitForMarketOrderFlowNavigationTarget(marketListBackTestId);

    if (await this.isOnPerpsPortfolioHome(1000)) {
      return;
    }

    if (
      await this.isTestIdVisible(PerpsOrderHeaderSelectorsIDs.BACK_BUTTON, 2000)
    ) {
      await Gestures.waitAndTap(
        Matchers.getElementByID(PerpsOrderHeaderSelectorsIDs.BACK_BUTTON),
        {
          elemDescription: 'Perps order header back (to market details)',
          timeout: 15000,
        },
      );
      await Utilities.waitUntil(
        async () =>
          (await this.isMarketDetailsBackVisible(1000)) ||
          (await this.isOnPerpsPortfolioHome(1000)),
        {
          interval: 500,
          timeout: 15000,
        },
      );
    }

    if (await this.isOnPerpsPortfolioHome(1000)) {
      return;
    }

    if (await this.isMarketDetailsBackVisible(3000)) {
      await PerpsMarketDetailsView.tapBackButton();
    }

    if (await this.isOnPerpsPortfolioHome(1000)) {
      return;
    }

    if (await this.isTestIdVisible(marketListBackTestId, 3000)) {
      await PerpsMarketListView.tapHeaderBackToPortfolioHome();
    }

    if (await this.isOnPerpsPortfolioHome(1000)) {
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
