import AppwrightSelectors from "../../helpers/AppwrightSelectors";


class GTMModal {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  get notNowButton() {
    return AppwrightSelectors.getElementByCatchAll(this._device, 'Not now');
  }

  async tapNotNow() {
    const btn = await this.notNowButton;
    await btn.tap();
  }

  async isVisible() {
    const btn = await this.notNowButton;
    await btn.isVisible({ timeout: 10000 });
  }
}

export default new GTMModal();


