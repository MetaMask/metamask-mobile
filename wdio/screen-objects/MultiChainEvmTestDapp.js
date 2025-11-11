import AppwrightSelectors from '../../e2e/framework/AppwrightSelectors';
import AppwrightGestures from '../../e2e/framework/AppwrightGestures';
import { expect } from 'appwright';
class MultiChainEvmTestDapp {
    constructor() {}

    get device() {
        return this._device;
    }

    set device(device) {
        this._device = device;
    }

    get terminateButton() {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            // fix this
            return AppwrightSelectors.getElementByXpath(this._device, '//android.widget.Button[@text="Terminate"]');
        }
    }

    get connectButton() {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            return AppwrightSelectors.getElementByID(this._device, 'connect-button');
        }
    }

    get connectedStatusHeader() {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            return AppwrightSelectors.getElementByID(this._device, 'connected-status');
        }
    }

    async tapTerminateButton() {
        if (!this._device) {
            return;
        }

        const element = await this.terminateButton;
        await AppwrightGestures.tap(element)
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

        const connectedStatusHeader = await this.connectedStatusHeader;
        if (!connectedStatusHeader) {
            return false;
        }

        const text = await connectedStatusHeader.getText();
        expect(text).toContain('Connected: true');
    }
}

export default new MultiChainEvmTestDapp();
