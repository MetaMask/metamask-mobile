import {
  PerpsGeneralSelectorsIDs,
  PerpsOrderViewSelectorsIDs,
  PerpsMarketListViewSelectorsIDs,
  PerpsClosePositionViewSelectorsIDs,
  PerpsPositionDetailsViewSelectorsIDs,
  PerpsMarketDetailsViewSelectorsIDs,
  getPerpsTPSLViewSelector,
} from '../../selectors/Perps/Perps.selectors';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import Assertions from '../../framework/Assertions';
import Utilities from '../../framework/Utilities';

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
  get backButtonMarketList() {
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

  get anchor(): DetoxElement {
    return Matchers.getElementByID('perps-tab-scroll-view');
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
    // SL quick buttons: [5, 10, 25, 50]
    const mapped = [0, 5, 10, 25, 50][percentage] || percentage;
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

  // Scroll helper on Perps tab (swipe over the tab ScrollView)
  async scrollDownOnPerpsTab(times = 1) {
    const anchor = this.anchor;
    for (let i = 0; i < times; i++) {
      await Gestures.swipe(anchor, 'up', {
        speed: 'fast',
        percentage: 0.7,
        elemDescription: 'Perps tab scroll down',
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
      timeout: 10000,
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
    await Utilities.waitForReadyState(this.placeOrderButton as DetoxElement, {
      checkStability: true,
      elemDescription: 'Place order button',
      timeout: 7000,
    });
    await Gestures.waitAndTap(this.placeOrderButton, {
      elemDescription: 'Tap Place Order',
      checkStability: true,
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
      waitForElementToDisappear: true,
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

  async tapBackButtonMarketList() {
    await Gestures.waitAndTap(this.backButtonMarketList, {
      elemDescription: 'Back button market list',
    });
  }
}

export default new PerpsView();
