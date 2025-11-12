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
            return AppwrightSelectors.getElementByXpath(this._device, '//*[@id="connect-button"]');
        }
    }

    get connectedStatusHeader() {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            // //p[@id="connected-status"]
            return AppwrightSelectors.getElementByXpath(this._device, '//*[@id="connected-status"]');
        }
    }

    get personalSignButton() {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            // //p[@id="connected-status"]
            return AppwrightSelectors.getElementByXpath(this._device, '//*[@id="personal-sign-button"]');
        }
    }

    get requestResponseHeader() {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            return AppwrightSelectors.getElementByXpath(this._device, '//*[@id="request-response"]');
        }
    }

    get sendTransactionButton() {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            return AppwrightSelectors.getElementByXpath(this._device, '//*[@id="send-transaction-button"]');
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

    async tapPersonalSignButton() {
        if (!this._device) {
            return;
        }

        const element = await this.personalSignButton;
        await AppwrightGestures.tap(element)
    }

    async tapSendTransactionButton() {
        if (!this._device) {
            return;
        }

        const element = await this.sendTransactionButton;
        await AppwrightGestures.tap(element)
    }

    async isDappConnected() {
        if (!this._device) {
            return false;
        }

        const connectedStatusHeader = await this.connectedStatusHeader;
        const text = await connectedStatusHeader.getText();
        expect(text).toContain('true');
    }

    async assertRequestResponseValue(value ) {
        if (!this._device) {
            return false;
        }

        const requestResponseHeader = await this.requestResponseHeader;
        const text = await requestResponseHeader.getText();
        expect(text).toContain(value);
    }
}

export default new MultiChainEvmTestDapp();
