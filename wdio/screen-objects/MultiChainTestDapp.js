import AppwrightSelectors from '../../tests/framework/AppwrightSelectors';
import AppwrightGestures from '../../tests/framework/AppwrightGestures';
import { expect as appwrightExpect } from 'appwright';
class MultiChainTestDapp {
    constructor() {}

    get device() {
        return this._device;
    }

    set device(device) {
        this._device = device;
    }

    get connectButton() {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            return AppwrightSelectors.getElementByXpath(this._device, '//android.widget.Button[@text="Connect"]');
        }
    }

    get connectedDappHeader() {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            return AppwrightSelectors.getElementByXpath(this._device, '//android.widget.TextView[@text="Connected Networks"]');
        }
    }

    async tapConnectButton() {
        if (!this._device) {
            return;
        }

        const element = await this.connectButton;
        await AppwrightGestures.tap(element)
    }

    async isDappConnected() {
        if (!this._device) {
            return false;
        }

        const element = await this.connectedDappHeader;
        await appwrightExpect(element).toBeVisible({ timeout: 10000 });
    }
}

export default new MultiChainTestDapp();
