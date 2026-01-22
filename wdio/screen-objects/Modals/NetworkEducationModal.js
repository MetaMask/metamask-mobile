import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';
import {
  NETWORK_EDUCATION_MODAL_CONTAINER_ID,
  NETWORK_EDUCATION_MODAL_NETWORK_NAME_ID,
} from '../testIDs/Components/NetworkEducationModalTestIds';
import { NETWORK_EDUCATION_MODAL_CLOSE_BUTTON } from "../testIDs/Screens/NetworksScreen.testids";
import AppwrightSelectors from '../../../tests/framework/AppwrightSelectors';

class NetworkEducationModal {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  get container() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(NETWORK_EDUCATION_MODAL_CONTAINER_ID);
    } else {
      return AppwrightSelectors.getElementByID(this._device, NETWORK_EDUCATION_MODAL_CONTAINER_ID);
    }
  }

  get networkEducationCloseButton() {
    if (!this._device) {
      return Selectors.getElementByPlatform(
        NETWORK_EDUCATION_MODAL_CLOSE_BUTTON,
      );
    } else {
      return AppwrightSelectors.getElementByID(this._device, NETWORK_EDUCATION_MODAL_CLOSE_BUTTON);
    }
  }

  get networkEducationNetworkName() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(
        NETWORK_EDUCATION_MODAL_NETWORK_NAME_ID,
      );
    } else {
      return AppwrightSelectors.getElementByID(this._device, NETWORK_EDUCATION_MODAL_NETWORK_NAME_ID);
    }
  }

  async waitForDisplayed() {
    const screen = await this.container;
    await screen.waitForDisplayed();
  }

  async tapGotItButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.networkEducationCloseButton);
    } else {
      const closeButton = await this.networkEducationCloseButton;
      await closeButton.tap();
    }
  }

  async waitForDisappear() {
    const element = await this.container;
    await element.waitForExist({ reverse: true });
  }

  async isNetworkEducationNetworkName(name) {
    if (!this._device) {
      await expect(this.networkEducationNetworkName).toHaveText(name);
    } else {
      await this.networkEducationNetworkName.toHaveText(name);
    }
  }
}

export default new NetworkEducationModal();
