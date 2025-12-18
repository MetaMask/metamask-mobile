import AppwrightSelectors from '../../e2e/framework/AppwrightSelectors';
import AppwrightGestures from '../../e2e/framework/AppwrightGestures';

class PerpsPositionsView {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  get positionItem() {
    return AppwrightSelectors.getElementByID(this._device, 'perps-positions-item');
  }

  async tapPositionItem() {
    await AppwrightGestures.tap(await this.positionItem);
  }
}

export default new PerpsPositionsView();

