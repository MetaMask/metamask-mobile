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

    get clearButton() {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            return AppwrightSelectors.getElementByXpath(this._device, '//android.widget.Button[@text="Clear Extension ID"]');
        }
    }

    get connectMMCButton() {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            return AppwrightSelectors.getElementByXpath(this._device, '//android.widget.Button[@text="Auto Connect via MM Connect"]');
        }
    }

    get connectedChainsHeader() {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            return AppwrightSelectors.getElementByXpath(this._device, '//android.widget.TextView[@text="Connected Chains"]');
        }
    }

    async tapClearButton() {
        if (!this._device) {
            return;
        }

        const element = await this.clearButton;
        await AppwrightGestures.tap(element)
    }

    async tapConnectMMCButton() {
        if (!this._device) {
            return;
        }

        const element = await this.connectMMCButton;
        await AppwrightGestures.tap(element)
    }

    async isDappConnected() {
        if (!this._device) {
            return false;
        }

        const element = await this.connectedChainsHeader;
        await appwrightExpect(element).toBeVisible({ timeout: 10000 });
    }
}

export default new MultiChainTestDapp();
