import AppwrightSelectors from '../../e2e/framework/AppwrightSelectors';
import AppwrightGestures from '../../e2e/framework/AppwrightGestures';

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
    await AppwrightGestures.tap(this.backButtonMarketList); // Use static tap method with retry logic
  }
}

export default new PerpsMarketListView();



