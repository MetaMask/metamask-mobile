import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';
import {
  NETWORK_EDUCATION_MODAL_CLOSE_BUTTON_ID,
  NETWORK_EDUCATION_MODAL_CONTAINER_ID,
  NETWORK_EDUCATION_MODAL_NETWORK_NAME_ID,
} from '../testIDs/Components/NetworkEducationModalTestIds';

class NetworkEducationModal {
  get container() {
    return Selectors.getElementByPlatform(NETWORK_EDUCATION_MODAL_CONTAINER_ID);
  }

  get networkEducationCloseButton() {
    return Selectors.getElementByPlatform(
      NETWORK_EDUCATION_MODAL_CLOSE_BUTTON_ID,
    );
  }

  get networkEducationNetworkName() {
    return Selectors.getElementByPlatform(
      NETWORK_EDUCATION_MODAL_NETWORK_NAME_ID,
    );
  }

  async waitForDisplayed() {
    const screen = await this.container;
    await screen.waitForDisplayed();
  }

  async tapGotItButton() {
    await Gestures.waitAndTap(this.networkEducationCloseButton);
  }

  async waitForDisappear() {
    const element = await this.container;
    await element.waitForExist({ reverse: true });
  }

  async isNetworkEducationNetworkName(name) {
    await expect(this.networkEducationNetworkName).toHaveText(name);
  }
}

export default new NetworkEducationModal();
