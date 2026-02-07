import AppwrightSelectors from '../../../tests/framework/AppwrightSelectors';
import AppwrightGestures from '../../../tests/framework/AppwrightGestures';
import { expect } from 'appwright';

class DappConnectionModal {
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
            return AppwrightSelectors.getElementByID(this._device, 'connect-button');
        }
    }

    get updateAccountsButton() {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            return AppwrightSelectors.getElementByID(this._device, 'multiconnect-connect-button');
        }
    }

    get editAccountsButton() {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            return AppwrightSelectors.getElementByXpath(this._device, '//android.view.ViewGroup[@content-desc="Edit accounts"]');
        }
    }

    get permissionsTabButton() {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            return AppwrightSelectors.getElementByXpath(this._device, '//android.view.ViewGroup[@content-desc="Permissions"]');
        }
    }

    get editNetworksButton() {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            return AppwrightSelectors.getElementByXpath(this._device, '(//android.widget.TextView[@text="Edit"])[2]');
        }
    }

    get updateNetworksButton() {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            return AppwrightSelectors.getElementByXpath(this._device, '//android.widget.Button[@content-desc="Update"]');
        }
    }

    // TODO: Might be able to use the AccountListComponent instead of this
    getAccountButton(accountName) {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            return AppwrightSelectors.getElementByXpath(this._device, `//android.widget.TextView[@resource-id="multichain-account-cell-address" and @text="${accountName}"]`);
        }
    }

    getNetworkButton(networkName) {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            return AppwrightSelectors.getElementByXpath(this._device, `//android.widget.TextView[@resource-id="cellbase-avatar-title" and @text="${networkName}"]`);
        }
    }

    async tapConnectButton() {
        if (!this._device) {
            return;
        }

        const element = await this.connectButton;
        await AppwrightGestures.tap(element)
    }

    async tapEditAccountsButton() {
        if (!this._device) {
            return;
        }

        const element = await this.editAccountsButton;
        await AppwrightGestures.tap(element)
    }

    async tapAccountButton(accountName) {
        if (!this._device) {
            return;
        }

        const element = await this.getAccountButton(accountName);
        await AppwrightGestures.tap(element)
    }

    async tapUpdateAccountsButton() {
        if (!this._device) {
            return;
        }

        const element = await this.updateAccountsButton;
        await AppwrightGestures.tap(element)
    }

    async tapPermissionsTabButton() {
        if (!this._device) {
            return;
        }

        const element = await this.permissionsTabButton;
        await AppwrightGestures.tap(element)
    }

    async tapEditNetworksButton() {
        if (!this._device) {
            return;
        }

        const element = await this.editNetworksButton;
        await AppwrightGestures.tap(element)
    }

    async tapNetworkButton(networkName) {
        if (!this._device) {
            return;
        }

        const element = await this.getNetworkButton(networkName);
        await AppwrightGestures.tap(element)
    }

    async tapUpdateNetworksButton() {
        if (!this._device) {
            return;
        }

        const element = await this.updateNetworksButton;
        await AppwrightGestures.tap(element)
    }

    async waitForToastWithText(text, timeout = 10000) {
        if (!this._device) {
            return;
        }

        const toastText = await AppwrightSelectors.getElementByText(this._device, text);
        await expect(toastText).toBeVisible({ timeout });
    }
}

export default new DappConnectionModal();
