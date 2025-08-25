import {
  PerpsPositionCardSelectorsIDs,
  PerpsGeneralSelectorsIDs,
  PerpsOrderViewSelectorsIDs,
} from '../../selectors/Perps/Perps.selectors';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';

class PerpsView {
  get closePositionButton() {
    return Matchers.getElementByID(PerpsPositionCardSelectorsIDs.CLOSE_BUTTON);
  }

  get setTpslButton() {
    return Matchers.getElementByID(
      PerpsGeneralSelectorsIDs.BOTTOM_SHEET_FOOTER_BUTTON,
    );
  }

  get closePositionBottomSheetButton() {
    return Matchers.getElementByID(
      PerpsGeneralSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
    );
  }

  get placeOrderButton() {
    return Matchers.getElementByID(
      PerpsOrderViewSelectorsIDs.PLACE_ORDER_VIEW_BUTTON,
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

  async tapClosePositionBottomSheetButton() {
    await Gestures.waitAndTap(this.closePositionBottomSheetButton, {
      elemDescription: 'Close position bottom sheet button',
    });
  }
}

export default new PerpsView();
