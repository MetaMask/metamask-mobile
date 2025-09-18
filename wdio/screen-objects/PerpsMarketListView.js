import AppwrightSelectors from '../helpers/AppwrightSelectors.js';
import AppwrightGestures from '../../appwright/utils/AppwrightGestures.js';

class PerpsMarketListView extends AppwrightGestures {
  constructor() {
    super();
  }

  set device(device) {
    this._device = device;
    super.device = device; // Set device in parent class too
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
    await this.tap(this.backButtonMarketList); // Use inherited tap method with retry logic
  }
}

export default new PerpsMarketListView();



