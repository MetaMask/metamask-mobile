import AppwrightSelectors from '../../e2e/framework/AppwrightSelectors';
import AppwrightGestures from '../../e2e/framework/AppwrightGestures';

class MobileBrowserScreen {
    constructor() {}

    get device() {
        return this._device;
    }

    set device(device) {
        this._device = device;

    }

    get chromeHomePageSearchBox() {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            return AppwrightSelectors.getElementByID(this._device, 'com.android.chrome:id/search_box_text');
        }
        // TODO: Add iOS selector
    }

    get chromeUrlBar() {
        if (!this._device) {
            return;
        } 

        if (AppwrightSelectors.isAndroid(this._device)) {
            return AppwrightSelectors.getElementByID(this._device, 'com.android.chrome:id/url_bar');
        }
    }

    async tapSearchBox() {
        if (!this._device) {
            return;
        }

        const element = await this.chromeHomePageSearchBox;
        await AppwrightGestures.tap(element)
    }

    async tapUrlBar() {
        if (!this._device) {
            return;
        }

        const element = await this.chromeUrlBar;
        await AppwrightGestures.tap(element)
    }
}
  
  export default new MobileBrowserScreen();
  