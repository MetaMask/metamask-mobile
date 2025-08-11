// No selectors needed - using direct element IDs
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';

class PerpsOrderView {
  get placeOrderButton() {
    return Matchers.getElementByID('place-order-button');
  }

  get takeProfitButton() {
    return Matchers.getElementByID('perps-order-view-take-profit-button');
  }

  async tapPlaceOrderButton() {
    await Gestures.waitAndTap(this.placeOrderButton);
  }

  async tapTakeProfitButton() {
    await Gestures.waitAndTap(this.takeProfitButton);
  }
}

export default new PerpsOrderView();
