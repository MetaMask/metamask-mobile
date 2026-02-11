import AppwrightSelectors from '../../tests/framework/AppwrightSelectors';
import AppwrightGestures from '../../tests/framework/AppwrightGestures';

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


