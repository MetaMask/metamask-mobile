import AppwrightSelectors from '../../../e2e/framework/AppwrightSelectors';
import AppwrightGestures from '../../../e2e/framework/AppwrightGestures';

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
            // Use getElementByID which is more efficient than XPath
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

        // Temporarily tapping by coordinates
        // await AppwrightGestures.tapByCoordinates(this._device, { x: 815, y: 2160 }, { delay: 1500 });
    }

    async tapEditAccountsButton() {
        if (!this._device) {
            return;
        }

        const element = await this.editAccountsButton;
        await AppwrightGestures.tap(element)

        // Temporarily tapping by coordinates
        // await AppwrightGestures.tapByCoordinates(this._device, { x: 140, y: 775 }, { delay: 1500 });
    }

    async tapAccountButton(accountName) {
        if (!this._device) {
            return;
        }

        const element = await this.getAccountButton(accountName);
        await AppwrightGestures.tap(element)

        // Temporarily tapping by coordinates
        // hardcoded to account 3
        // await AppwrightGestures.tapByCoordinates(this._device, { x: 195, y: 1520 }, { delay: 1500 });
    }

    async tapUpdateAccountsButton() {
        if (!this._device) {
            return;
        }

        const element = await this.updateAccountsButton;
        await AppwrightGestures.tap(element)

        // Temporarily tapping by coordinates
        // await AppwrightGestures.tapByCoordinates(this._device, { x: 550, y: 2160 }, { delay: 1500 });
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
}

export default new DappConnectionModal();
