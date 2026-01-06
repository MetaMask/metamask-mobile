import AppwrightSelectors from '../../e2e/framework/AppwrightSelectors';
import AppwrightGestures from '../../e2e/framework/AppwrightGestures';
import { expect } from 'appwright';
class WagmiTestDapp {
    constructor() {}

    get device() {
        return this._device;
    }

    set device(device) {
        this._device = device;
    }

    get disconnectButton() {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            return AppwrightSelectors.getElementByXpath(this._device, '//*[@id="disconnect-button"]');
        }
    }

    get connectButton() {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            return AppwrightSelectors.getElementByXpath(this._device, '//*[@id="connect-MetaMask"]');
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
            return AppwrightSelectors.getElementByXpath(this._device, '//*[@id="connected-account"]');
        }
    }

    get personalSignButton() {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            // //p[@id="connected-status"]
            return AppwrightSelectors.getElementByXpath(this._device, '//*[@id="sign-message-button"]');
        }
    }

    get personalSignResponse() {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            return AppwrightSelectors.getElementByXpath(this._device, '//*[@id="sign-message-response"]');
        }
    }

    getSwitchChainButton(chainId) {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            return AppwrightSelectors.getElementByXpath(this._device, `//*[@id="switch-chain-${chainId}"]`);
        }
    }

    async tapDisconnectButton() {
        if (!this._device) {
            return;
        }

        const element = await this.disconnectButton;
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

    async tapSwitchChainButton(chainId) {
        if (!this._device) {
            return;
        }

        const element = await this.getSwitchChainButton(chainId);
        await AppwrightGestures.tap(element)
    }

    async isDappConnected() {
        this.assertDappConnectedStatus('connected');
    }

    async assertDappConnectedStatus(value) {
        if (!this._device) {
            return false;
        }

        const connectedStatusHeader = await this.connectedStatusHeader;
        const text = await connectedStatusHeader.getText();
        expect(text).toContain(`status: ${value}`);
    }

    async assertConnectedChainValue(value) {
        if (!this._device) {
            return false;
        }

        const connectedChainHeader = await this.connectedChainHeader;
        const text = await connectedChainHeader.getText();
        expect(text).toContain(`chainId: ${value}`);
    }

    async assertConnectedAccountsValue(value) {
        if (!this._device) {
            return false;
        }

        const connectedAccountsHeader = await this.connectedAccountsHeader;
        const text = await connectedAccountsHeader.getText();
        expect(text).toContain(`account: ${value}`);
    }

    async assertPersonalSignResponseValue(value) {
        if (!this._device) {
            return false;
        }

        const personalSignResponse = await this.personalSignResponse;
        const text = await personalSignResponse.getText();
        expect(text).toContain(value);
    }
}

export default new WagmiTestDapp();
