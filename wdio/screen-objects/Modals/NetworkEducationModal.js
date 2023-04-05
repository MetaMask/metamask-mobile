import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';
import {
  NETWORK_EDUCATION_MODAL_CLOSE_BUTTON_ID,
  NETWORK_EDUCATION_MODAL_NETWORK_NAME_ID,
} from '../testIDs/Components/NetworkEducationModalTestIds';

class NetworkEducationModal {
  get networkEducationCloseButton() {
    return Selectors.getElementByPlatform(
      NETWORK_EDUCATION_MODAL_CLOSE_BUTTON_ID,
    );
  }

  get networkEducationNetworkName() {
    return Selectors.getXpathElementByResourceId(
      NETWORK_EDUCATION_MODAL_NETWORK_NAME_ID,
    );
  }

  async tapGotItButton() {
    await Gestures.waitAndTap(this.networkEducationCloseButton);
  }

  async waitForGotItButtonToDisappear() {
    const element = await this.networkEducationCloseButton;
    await element.waitForExist({ reverse: true });
  }

  async isNetworkEducationNetworkName(name) {
    const element = await this.networkEducationNetworkName;
    await expect(await element.getText()).toContain(name);
  }
}

export default new NetworkEducationModal();
