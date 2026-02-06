import AppwrightSelectors from '../../tests/framework/AppwrightSelectors';
import AppwrightGestures from '../../tests/framework/AppwrightGestures';
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
            return AppwrightSelectors.getElementByXpath(this._device, '//*[@id="terminate-button"]');
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
            return AppwrightSelectors.getElementByXpath(this._device, '//*[@id="connected-status"]');
        }
    }

    get personalSignButton() {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
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

    get switchToPolygonButton() {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            return AppwrightSelectors.getElementByXpath(this._device, '//*[@id="switch-to-polygon-button"]');
        }
    }

    get switchToEthereumMainnetButton() {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            return AppwrightSelectors.getElementByXpath(this._device, '//*[@id="switch-to-mainnet-button"]');
        }
    }

    get connectedChainHeader() {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            return AppwrightSelectors.getElementByXpath(this._device, '//*[@id="connected-chain"]');
        }
    }

    get connectedAccountsHeader() {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            return AppwrightSelectors.getElementByXpath(this._device, '//*[@id="connected-accounts"]');
        }
    }

    get ethGetBalanceButton() {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            return AppwrightSelectors.getElementByXpath(this._device, '//*[@id="eth-get-balance-button"]');
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

    async tapSwitchToPolygonButton() {
        if (!this._device) {
            return;
        }

        const element = await this.switchToPolygonButton;
        await AppwrightGestures.tap(element)
    }

    async tapSwitchToEthereumMainnetButton() {
        if (!this._device) {
            return;
        }

        const element = await this.switchToEthereumMainnetButton;
        await AppwrightGestures.tap(element)
    }

    async tapEthGetBalanceButton() {
        if (!this._device) {
            return;
        }

        const element = await this.ethGetBalanceButton;
        await AppwrightGestures.tap(element)
    }

    async isDappConnected() {
        return this.assertDappConnected('true');
    }

    async assertDappConnected(value) {
        if (!this._device) {
            return false;
        }

        const connectedStatusHeader = await this.connectedStatusHeader;
        const text = await connectedStatusHeader.getText();
        expect(text).toContain(value);
    }

    async assertRequestResponseValue(value ) {
        if (!this._device) {
            return false;
        }

        const requestResponseHeader = await this.requestResponseHeader;
        const text = await requestResponseHeader.getText();
        expect(text).toContain(value);
    }

    async assertConnectedChainValue(value) {
        if (!this._device) {
            return false;
        }

        const connectedChainHeader = await this.connectedChainHeader;
        const text = await connectedChainHeader.getText();
        expect(text).toContain(value);
    }

    async assertConnectedAccountsValue(value) {
        if (!this._device) {
            return false;
        }

        const connectedAccountsHeader = await this.connectedAccountsHeader;
        const text = await connectedAccountsHeader.getText();
        expect(text).toContain(value);
    }
}

export default new MultiChainEvmTestDapp();
