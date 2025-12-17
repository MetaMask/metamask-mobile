import AppwrightSelectors from '../../e2e/framework/AppwrightSelectors';
import AppwrightGestures from '../../e2e/framework/AppwrightGestures';

class PerpsClosePositionView {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  get confirmButton() {
    return AppwrightSelectors.getElementByID(this._device, 'close-position-confirm-button');
  }

  async tapConfirmButton() {
    await AppwrightGestures.tap(await this.confirmButton);
  }
}

export default new PerpsClosePositionView();


