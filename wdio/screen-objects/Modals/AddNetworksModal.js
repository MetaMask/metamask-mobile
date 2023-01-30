import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';
import { ADD_NETWORK_BUTTON } from '../testIDs/Screens/NetworksScreen.testids';

class AddNetworksModal {
  get AddNetworksButton() {
    return Selectors.getElementByPlatform(ADD_NETWORK_BUTTON);
  }

  async clickAddNetworks() {
    await Gestures.tap(this.AddNetworksButton);
  }
}
export default new AddNetworksModal();
