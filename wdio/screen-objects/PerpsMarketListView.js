import AppwrightSelectors from '../../e2e/framework/AppwrightSelectors';
import AppwrightGestures from '../../e2e/framework/AppwrightGestures';
import { expect as appwrightExpect } from 'appwright';

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
    await appwrightExpect(header).toBeVisible({ timeout: 10000 });
  }

  async tapBackButtonMarketList() {
    await AppwrightGestures.tap(await this.backButtonMarketList); // Use static tap method with retry logic
  }

  async selectMarket(symbol) {
    // ID format from Perps.selectors.ts: `perps-market-row-item-${symbol}`
    const marketRow = await AppwrightSelectors.getElementByID(this._device, `perps-market-row-item-${symbol}`);
    await AppwrightGestures.tap(marketRow);
  }
}

export default new PerpsMarketListView();
