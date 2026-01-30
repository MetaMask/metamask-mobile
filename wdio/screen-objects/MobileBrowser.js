import AppwrightSelectors from '../../tests/framework/AppwrightSelectors';
import AppwrightGestures from '../../tests/framework/AppwrightGestures';

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

    get onboardingChromeWithoutAccount() {
        if (!this._device) {
            return;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            return AppwrightSelectors.getElementByID(this._device, 'com.android.chrome:id/signin_fre_dismiss_button');
        }
    }

    get chromeNoThanksButton() {
        if (!this._device) {
            return;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            return AppwrightSelectors.getElementByID(this._device, 'com.android.chrome:id/negative_button');
        }
    }

    async tapSelectDappUrl(dappName) {
        if (!this._device) {
            return;
        }

        const element = await AppwrightSelectors.getElementByText(this._device, dappName);
        await AppwrightGestures.tap(element)
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

    async tapOnboardingChromeWithoutAccount() {
        if (!this._device) {
            return;
        }

        const element = await this.onboardingChromeWithoutAccount;
        await AppwrightGestures.tap(element)
    }

    async tapChromeNoThanksButton() {
        if (!this._device) {
            return;
        }

        const element = await this.chromeNoThanksButton;
        await AppwrightGestures.tap(element)
    }
}

  export default new MobileBrowserScreen();
