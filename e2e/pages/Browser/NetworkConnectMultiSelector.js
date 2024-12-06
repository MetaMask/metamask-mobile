import { NetworkConnectMultiSelectorSelectorsIDs } from '../../selectors/Browser/NetworkConnectMultiSelector.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class NetworkConnectMultiSelector {
  get container() {
    return Matchers.getElementByID(
      NetworkConnectMultiSelectorSelectorsIDs.CONTAINER,
    );
  }

  get backButton() {
    return Matchers.getElementByID(
      NetworkConnectMultiSelectorSelectorsIDs.BACK_BUTTON,
    );
  }

  async tapBackButton() {
    await Gestures.waitAndTap(this.backButton);
  }
}

export default new NetworkConnectMultiSelector();
