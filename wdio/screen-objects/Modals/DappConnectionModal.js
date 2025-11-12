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

    async tapConnectButton() {
        if (!this._device) {
            return;
        }

        // const element = await this.connectButton;
        // await AppwrightGestures.tap(element)

        // Temporarily tapping by coordinates
        await AppwrightGestures.tapByCoordinates(this._device, { x: 815, y: 2160 }, { delay: 1500 });
    }
}

export default new DappConnectionModal();
