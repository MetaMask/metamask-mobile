import AppwrightSelectors from '../helpers/AppwrightSelectors.js';

class PerpsMarketListView {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  async isHeaderVisible() {
    const header = await AppwrightSelectors.getElementByID(this._device, 'perps-market-list-header');
    await header.isVisible({ timeout: 10000 });
  }

  async tapBackButton() {
    const back = await AppwrightSelectors.getElementByID(this._device, 'perps-market-list-back-button');
    await back.tap();
  }
}

export default new PerpsMarketListView();



