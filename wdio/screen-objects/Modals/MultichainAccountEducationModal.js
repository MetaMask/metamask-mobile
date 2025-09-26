import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';
import AppwrightSelectors from '../../helpers/AppwrightSelectors';
import AppwrightGestures from '../../../appwright/utils/AppwrightGestures';
import { expect } from 'appwright';
import { MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS } from '../../../app/components/Views/MultichainAccounts/IntroModal/testIds';

class MultichainAccountEducationModal extends AppwrightGestures {
  constructor() {
    super();
  }

  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
    super.device = device; // Set device in parent class too
  }

  get closeButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(
        MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.CLOSE_BUTTON,
      );
    } else {
      return AppwrightSelectors.getElementByID(
        this._device,
        MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.CLOSE_BUTTON,
      );
    }
  }

  async isVisible(timeout = 10000) {
    await expect(await this.closeButton).toBeVisible({ timeout });
  }

  async tapGotItButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.closeButton);
    } else {
      await this.tap(this.closeButton);
    }
  }
}

export default new MultichainAccountEducationModal();