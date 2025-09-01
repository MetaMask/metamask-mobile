import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { NetworkManagerSelectorIDs } from '../../selectors/wallet/NetworkManager.selectors';

class NetworkManager {
  get popularNetworksTab(): DetoxElement {
    return Matchers.getElementByID(
      NetworkManagerSelectorIDs.POPULAR_NETWORKS_TAB,
    );
  }

  // TODO - replace with testIDs
  getNetworkByName(networkName: string): DetoxElement {
    return Matchers.getElementByText(networkName);
  }

  async tapNetwork(networkName: string) {
    const elem = this.getNetworkByName(networkName);
    await Gestures.waitAndTap(elem, {
      elemDescription: `NetworkManager - tapping network: ${networkName}`,
    });
  }
}

export default new NetworkManager();
