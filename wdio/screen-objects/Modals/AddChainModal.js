import AppwrightSelectors from '../../../tests/framework/AppwrightSelectors';
import AppwrightGestures from '../../../tests/framework/AppwrightGestures';
import { expect } from 'appwright';

class AddChainModal {
    constructor() {}

    get device() {
        return this._device;
    }

    set device(device) {
        this._device = device;
    }

    getText(value) {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            return AppwrightSelectors.getElementByXpath(this._device, `//android.widget.TextView[@text="${value}"]`);
        }
    }

    get confirmButton() {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            return AppwrightSelectors.getElementByID(this._device, 'approve-network-approve-button');
        }
    }

    async tapConfirmButton() {
        if (!this._device) {
            return;
        }

        const element = await this.confirmButton;
        await AppwrightGestures.tap(element)
    }


    async assertText(value) {
        if (!this._device) {
            return;
        }

        const text = await this.getText(value);
        await expect(text).toBeVisible();
    }
}

export default new AddChainModal();
