import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';
import AppwrightSelectors from '../../helpers/AppwrightSelectors';
import { expect } from 'appwright';


class MultichainAccountEducationModal {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  get closeButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(
        'MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS',
      );
    } else {
      return AppwrightSelectors.getElementByID(this._device, 'multichain-accounts-intro-modal-close-button');
    }
  }

  async isVisible(timeout = 10000) {
    await expect(await this.closeButton).toBeVisible({ timeout });
  }

  
  async tapGotItButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.closeButton);
    } else {
      const closeButton = await this.closeButton;
      await closeButton.tap();
    }
  }
}

export default new MultichainAccountEducationModal();
