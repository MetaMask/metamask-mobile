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

    /**
     * Tap the confirm/submit button on a Snap dialog.
     * Snap UIs use SnapUIFooterButton with testIDs like "${name}-snap-footer-button".
     * Matches any *-snap-footer-button that is NOT the cancel or default button.
     */
    async tapSnapConfirmButton({ timeout = 5000 } = {}) {
        if (!this._device) {
            return;
        }

        const snapConfirmXpath =
            '//*[contains(@resource-id,"snap-footer-button") ' +
            'and not(contains(@resource-id,"cancel")) ' +
            'and not(contains(@resource-id,"default-snap-footer-button"))]';
        const snapBtn = await AppwrightSelectors.getElementByXpath(
            this._device,
            snapConfirmXpath,
        );
        await expect(snapBtn).toBeVisible({ timeout });
        await AppwrightGestures.tap(snapBtn);
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
