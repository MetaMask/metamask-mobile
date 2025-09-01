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
import { ToastSelectorsText } from '../../selectors/wallet/ToastModal.selectors';

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

  // Perps Tab (home) helpers: search position cards by visible text instead of testIDs
  get perpsTabPositionText() {
    return (symbol: string, leverageX: number, direction: 'long' | 'short') =>
      `${symbol} ${leverageX}x ${direction}`;
  }

  async expectPerpsTabPosition(
    symbol: string,
    leverageX: number,
    direction: 'long' | 'short',
    index = 0,
  ) {
    const text = this.perpsTabPositionText(symbol, leverageX, direction);
    const el = (await Matchers.getElementByText(
      text,
      index,
    )) as unknown as DetoxElement;
    await Assertions.expectElementToBeVisible(el, {
      description: `Expect Perps tab position: ${text} at index ${index}`,
    });
  }

  get setTpslButton() {
    return Matchers.getElementByID(
      PerpsGeneralSelectorsIDs.BOTTOM_SHEET_FOOTER_BUTTON,
    );
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

  async tapTakeProfitPercentageButton(percentage: number) {
    const button = Matchers.getElementByID(
      `perps-tpsl-take-profit-percentage-button-${percentage}`,
    );
    await Gestures.waitAndTap(button);
  }

  async tapStopLossPercentageButton(percentage: number) {
    const button = Matchers.getElementByID(
      `perps-tpsl-stop-loss-percentage-button-${percentage}`,
    );
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
    let button: DetoxElement | null = null;
    try {
      const tryDismiss = Matchers.getElementByText('Dismiss');
      await Assertions.expectElementToBeVisible(tryDismiss as DetoxElement, {
        description: 'Toast Dismiss button visible',
        timeout: 3000,
      });
      button = tryDismiss as DetoxElement;
    } catch {
      const tryClose = Matchers.getElementByText(
        ToastSelectorsText.CLOSE_BUTTON,
      );
      await Assertions.expectElementToBeVisible(tryClose as DetoxElement, {
        description: 'Toast Close button visible',
        timeout: 5000,
      });
      button = tryClose as DetoxElement;
    }
    await Gestures.waitAndTap(button as DetoxElement, {
      elemDescription: 'Tap toast close',
      delay: 100,
    });
    // await Assertions.expectElementToNotBeVisible(this.toastContainer, {
    //   description: 'Toast container should disappear',
    //   timeout: 10000,
    // });
  }

  async tapClosePositionBottomSheetButton() {
    await Gestures.waitAndTap(this.closePositionBottomSheetButton, {
      elemDescription: 'Close position bottom sheet button',
    });
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
