import { PerpsPositionCardSelectorsIDs } from '../../selectors/Perps/Perps.selectors';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
class PerpsView {
  get closePositionButton() {
    return Matchers.getElementByID(PerpsPositionCardSelectorsIDs.CLOSE_BUTTON);
  }

  get setTpslButton() {
    return Matchers.getElementByID('bottomsheetfooter-button');
  }

  get placeOrderButton() {
    return Matchers.getElementByID('perps-order-view-place-order-button');
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
}

export default new PerpsView();
