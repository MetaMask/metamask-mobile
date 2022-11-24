import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';
import {NETWORK_EDUCATION_MODAL_CLOSE_BUTTON} from 'wdio/features/testIDs/Screens/NetworksScreen.testids.js';


class NetworkRemovalModal {

get networkEducationCloseButton() {
  return Selectors.getElementByPlatform(NETWORK_EDUCATION_MODAL_CLOSE_BUTTON);
}

async confirmNetworkSwitch(){
  await Gestures.tap(this.networkEducationCloseButton);
}
}
export default new NetworkRemovalModal();
