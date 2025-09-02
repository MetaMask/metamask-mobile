import {
  PerpsPositionCardSelectorsIDs,
  PerpsGeneralSelectorsIDs,
  PerpsOrderViewSelectorsIDs,
  PerpsMarketListViewSelectorsIDs,
  PerpsClosePositionViewSelectorsIDs,
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
    const anchor = Matchers.getElementByID(
      'perps-tab-scroll-view',
    ) as unknown as DetoxElement;
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

  get setTpslButton() {
    return Matchers.getElementByID(
      PerpsGeneralSelectorsIDs.BOTTOM_SHEET_FOOTER_BUTTON,
    );
  }

  // "Edit TP/SL" button visible on position details
  get editTpslButton() {
    return Matchers.getElementByText('Edit TP/SL');
  }

  async tapEditTpslButton() {
    await Gestures.waitAndTap(this.editTpslButton as unknown as DetoxElement, {
      elemDescription: 'Tap Edit TP/SL button',
    });
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

  async tapClosePositionButton() {
    await Gestures.waitAndTap(this.closePositionButton);
  }

  async tapConfirmClosePositionButton() {
    await Gestures.waitAndTap(this.closePositionButton, {
      elemDescription: 'Confirm close position button',
    });
  }

  getTakeProfitPercentageButton(percentage: number) {
    return Matchers.getElementByID(
      `perps-tpsl-take-profit-percentage-button-${percentage}`,
    );
  }

  async tapTakeProfitPercentageButton(percentage: number) {
    const button = this.getTakeProfitPercentageButton(percentage);
    await Gestures.waitAndTap(button);
  }

  getStopLossPercentageButton(percentage: number) {
    return Matchers.getElementByID(
      `perps-tpsl-stop-loss-percentage-button-${percentage}`,
    );
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
    const button = Matchers.getElementByText('Dismiss');
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
