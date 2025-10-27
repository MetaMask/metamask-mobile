class MultiChainTestDapp {
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
            return AppwrightSelectors.getElementByID(this._device, 'connect_button');
        }
    }
}

export default new MultiChainTestDapp();