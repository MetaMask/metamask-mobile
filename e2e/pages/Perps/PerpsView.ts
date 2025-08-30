import {
  PerpsPositionCardSelectorsIDs,
  PerpsGeneralSelectorsIDs,
  PerpsOrderViewSelectorsIDs,
} from '../../selectors/Perps/Perps.selectors';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import Assertions from '../../framework/Assertions';
import { ToastSelectorsText } from '../../selectors/wallet/ToastModal.selectors';

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
}

export default new PerpsView();
