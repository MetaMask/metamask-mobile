  import Selectors from '../../helpers/Selectors';
  import Gestures from '../../helpers/Gestures';
import { NETWORK_EDUCATION_MODAL_CLOSE_BUTTON_ID } from '../../testIDs/Components/NetworkEducationModalTestIds';

class NetworkEducationModal {

  get networkEducationCloseButton() {
    return Selectors.getElementByPlatform(NETWORK_EDUCATION_MODAL_CLOSE_BUTTON_ID);
  }

  async tapGotItButton(){
    await driver.pause(3000);
    await Gestures.tap(this.networkEducationCloseButton);
  }
}
export default new NetworkEducationModal();
