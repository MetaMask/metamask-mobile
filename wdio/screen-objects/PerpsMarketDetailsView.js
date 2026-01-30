import AppwrightSelectors from '../../tests/framework/AppwrightSelectors';
import AppwrightGestures from '../../tests/framework/AppwrightGestures';

class PerpsMarketDetailsView {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  get longButton() {
    return AppwrightSelectors.getElementByID(this._device, 'perps-market-details-long-button');
  }

  get shortButton() {
    return AppwrightSelectors.getElementByID(this._device, 'perps-market-details-short-button');
  }

  async tapLongButton() {
    await AppwrightGestures.tap(await this.longButton);
  }

  async tapShortButton() {
    await AppwrightGestures.tap(await this.shortButton);
  }
}

export default new PerpsMarketDetailsView();

