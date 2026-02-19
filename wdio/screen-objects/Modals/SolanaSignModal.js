import AppwrightSelectors from '../../../tests/framework/AppwrightSelectors';
import AppwrightGestures from '../../../tests/framework/AppwrightGestures';

class SolanaSignModal {
    constructor() {}

    get device() {
        return this._device;
    }

    set device(device) {
        this._device = device;
    }

    get confirmButton() {
        if (!this._device) {
            return null;
        }

        if (AppwrightSelectors.isAndroid(this._device)) {
            return AppwrightSelectors.getElementByXpath(this._device, '//android.widget.TextView[@text="Confirm"]');
        }
    }

    async tapConfirmButton() {
        if (!this._device) {
            return;
        }

        const element = await this.confirmButton;
        await AppwrightGestures.tap(element)
    }
}

export default new SolanaSignModal();
