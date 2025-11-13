import AppwrightSelectors from '../../../e2e/framework/AppwrightSelectors';
import AppwrightGestures from '../../../e2e/framework/AppwrightGestures';
import { expect } from 'appwright';

class SignModal {
    constructor() {}

    get device() {
        return this._device;
    }

    set device(device) {
        this._device = device;
    }

    get confirmButton() {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            // Use getElementByID which is more efficient than XPath
            return AppwrightSelectors.getElementByID(this._device, 'confirm-button');
        }
    }

    get cancelButton() {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            return AppwrightSelectors.getElementByID(this._device, 'cancel-button');
        }
    }

    getNetworkText(network) {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            return AppwrightSelectors.getElementByXpath(this._device, `(//android.widget.TextView[@text="${network}"])[1]`);
        }
    }

    async tapConfirmButton() {
        if (!this._device) {
            return;
        }

        const element = await this.confirmButton;
        await AppwrightGestures.tap(element)

        // Temporarily tapping by coordinates
        // await AppwrightGestures.tapByCoordinates(this._device, { x: 815, y: 2060 }, { delay: 1500 });
    }

    async tapCancelButton() {
        if (!this._device) {
            return;
        }

        const element = await this.cancelButton;
        await AppwrightGestures.tap(element)

        // Temporarily tapping by coordinates
        // await AppwrightGestures.tapByCoordinates(this._device, { x: 165, y: 2060 }, { delay: 1500 });
    }

    async assertNetworkText(network) {
        if (!this._device) {
            return;
        }

        const networkText = await this.getNetworkText(network);
        await expect(networkText).toBeVisible();
    }
}

export default new SignModal();
