import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { PerpsOrderViewSelectorsIDs } from '../../selectors/Perps/Perps.selectors';

class PerpsOrderView {
  get placeOrderButton() {
    return Matchers.getElementByID(
      PerpsOrderViewSelectorsIDs.PLACE_ORDER_BUTTON,
    );
  }

  get takeProfitButton() {
    return Matchers.getElementByID(
      PerpsOrderViewSelectorsIDs.TAKE_PROFIT_BUTTON,
    );
  }

  async tapPlaceOrderButton() {
    await Gestures.waitAndTap(this.placeOrderButton);
  }

  async tapTakeProfitButton() {
    await Gestures.waitAndTap(this.takeProfitButton);
  }
}

export default new PerpsOrderView();
