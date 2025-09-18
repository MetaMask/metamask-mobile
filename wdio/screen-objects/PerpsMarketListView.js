import AppwrightSelectors from '../helpers/AppwrightSelectors.js';

class PerpsMarketListView {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  get backButtonMarketList() {
    return AppwrightSelectors.getElementByID(this._device, 'perps-market-list-back-button');
  }

  get listHeader() {
    return AppwrightSelectors.getElementByID(this._device, 'perps-market-list-header');
  }

  async isHeaderVisible() { 
    const header = await this.listHeader;
    await header.isVisible({ timeout: 10000 });
  }

  async tapBackButtonMarketList() {
    const backButtonMarketList = await this.backButtonMarketList;
    await backButtonMarketList.tap();
  }
}

export default new PerpsMarketListView();



