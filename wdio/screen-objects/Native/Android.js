import AppwrightSelectors from '../../../tests/framework/AppwrightSelectors';
import AppwrightGestures from '../../../tests/framework/AppwrightGestures';
import { AppwrightLocator, Device } from 'appwright';

class AndroidScreenHelpers {
    constructor() {}

    get device() {
        return this._device;
    }

    set device(device) {
        this._device = device;
    }


    get openDeeplinkWithMetaMask() {
        if (!this._device) {
            return;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            return AppwrightSelectors.getElementByXpath(this._device, '//android.widget.TextView[@text="MetaMask"]');
        }
    }

    async tapOpenDeeplinkWithMetaMask() {
        if (!this._device) {
            return;
        }

        const element = await this.openDeeplinkWithMetaMask;
        await AppwrightGestures.tap(element)
    }
}

export default new AndroidScreenHelpers();
