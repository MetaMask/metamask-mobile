  import Selectors from '../../helpers/Selectors';
  import Gestures from '../../helpers/Gestures';
import { NETWORK_EDUCATION_MODAL_CONTAINER_ID } from '../../../../app/constants/test-ids';

class NetworkEducationModal {

  get networkEducationCloseButton() {
    return Selectors.getElementByPlatform(NETWORK_EDUCATION_MODAL_CONTAINER_ID);
  }

  async tapGotItButton(){
    await Gestures.tap(this.networkEducationCloseButton);
  }
}
export default new NetworkEducationModal();
