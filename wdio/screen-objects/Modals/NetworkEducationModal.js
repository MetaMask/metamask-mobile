/* global driver */
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
    await driver.pause(3000);
    await Gestures.tap(this.networkEducationCloseButton);
  }

  async isNetworkEducationNetworkName(name) {
    const element = await this.networkEducationNetworkName;
    await expect(await element.getText()).toContain(name);
  }
}
export default new NetworkEducationModal();
