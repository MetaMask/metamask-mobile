import {
  PerpsPositionCardSelectorsIDs,
  PerpsGeneralSelectorsIDs,
  PerpsOrderViewSelectorsIDs,
  PerpsMarketListViewSelectorsIDs,
  PerpsClosePositionViewSelectorsIDs,
  getPerpsTPSLBottomSheetSelector,
} from '../../selectors/Perps/Perps.selectors';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import Assertions from '../../framework/Assertions';

class PerpsView {
  get closePositionButton() {
    return Matchers.getElementByID(PerpsPositionCardSelectorsIDs.CLOSE_BUTTON);
  }

  getPositionItem(
    symbol: string,
    leverageX: number,
    direction: 'long' | 'short',
    index = 0,
  ) {
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
  get editTpslButton() {
    return Matchers.getElementByText('Edit TP/SL');
  }

  get closePositionBottomSheetButton() {
    return Matchers.getElementByID(
      PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
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

  get anchor() {
    return Matchers.getElementByID(
      'perps-tab-scroll-view',
    ) as unknown as DetoxElement;
  }

  getTakeProfitPercentageButton(percentage: number) {
    // Support legacy tests passing index (1..4) by mapping to actual ROE%
    // TP quick buttons: [10, 25, 50, 100]
    const mapped = [0, 10, 25, 50, 100][percentage] || percentage;
    return Matchers.getElementByID(
      getPerpsTPSLBottomSheetSelector.takeProfitPercentageButton(mapped),
    );
  }

  getStopLossPercentageButton(percentage: number) {
    // Support legacy tests passing index (1..4) by mapping to actual ROE% (loss magnitudes)
    // SL quick buttons: [5, 10, 25, 50]
    const mapped = [0, 5, 10, 25, 50][percentage] || percentage;
    return Matchers.getElementByID(
      getPerpsTPSLBottomSheetSelector.stopLossPercentageButton(mapped),
    );
  }

  async expectPosition(
    symbol: string,
    leverageX: number,
    direction: 'long' | 'short',
    index = 0,
  ) {
    const el = this.getPositionItem(symbol, leverageX, direction, index);
    await Assertions.expectElementToBeVisible(el as DetoxElement, {
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
    await Assertions.expectElementToBeVisible(el as DetoxElement, {
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
    await Gestures.waitAndTap(el as DetoxElement, {
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
    let visible = false;
    for (let i = 0; i < 6; i++) {
      try {
        const el = this.getPositionItem(
          symbol,
          leverageX,
          direction,
          index,
        ) as DetoxElement;
        await Assertions.expectElementToBeVisible(el as DetoxElement, {
          description: `Ensure visible: ${symbol} ${leverageX}x ${direction} at index ${index}`,
          timeout: 750,
        });
        visible = true;
        break;
      } catch {
        await this.scrollDownOnPerpsTab(1);
      }
    }
    if (!visible) {
      // Final attempt assertion to surface a clear error
      await this.expectPerpsTabPosition(symbol, leverageX, direction, index);
    }
  }

  async tapEditTpslButton() {
    await Gestures.waitAndTap(this.editTpslButton as unknown as DetoxElement, {
      elemDescription: 'Tap Edit TP/SL button',
    });
  }

  async tapClosePositionButton() {
    await Gestures.waitAndTap(this.closePositionButton);
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
    await Gestures.waitAndTap(this.placeOrderButton);
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
    await Gestures.waitAndTap(this.closePositionBottomSheetButton, {
      elemDescription: 'Close position bottom sheet button',
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
