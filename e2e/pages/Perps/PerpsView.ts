import {
  PerpsPositionCardSelectorsIDs,
  PerpsClosePositionBottomSheetSelectorsIDs,
} from '../../selectors/Perps/Perps.selectors';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';

class PerpsView {
  get closePositionButton() {
    return Matchers.getElementByID(PerpsPositionCardSelectorsIDs.CLOSE_BUTTON);
  }

  get confirmClosePositionButton() {
    return Matchers.getElementByID(
      PerpsClosePositionBottomSheetSelectorsIDs.CONFIRM_CLOSE_POSITION_BUTTON,
    );
  }

  async tapClosePositionButton() {
    await Gestures.waitAndTap(this.closePositionButton);
  }

  async tapConfirmClosePositionButton() {
    await Gestures.waitAndTap(this.confirmClosePositionButton, {
      elemDescription: 'Confirm close position button',
    });
  }

  async tapTakeProfitPercentageButton(percentage: number) {
    const button = Matchers.getElementByID(
      `take-profit-percentage-button-${percentage}`,
    );
    await Gestures.waitAndTap(button);
  }

  async tapStopLossPercentageButton(percentage: number) {
    const button = Matchers.getElementByID(
      `stop-loss-percentage-button-${percentage}`,
    );
    await Gestures.waitAndTap(button);
  }
}

export default new PerpsView();
