import AppwrightSelectors from '../../../tests/framework/AppwrightSelectors';
import AppwrightGestures from '../../../tests/framework/AppwrightGestures';
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
    }

    async tapCancelButton() {
        if (!this._device) {
            return;
        }

        const element = await this.cancelButton;
        await AppwrightGestures.tap(element)
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
