import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../framework/Assertions';
import { NetworkManagerSelectorIDs } from '../../selectors/wallet/NetworkManager.selectors';

class NetworkManager {
  /**
   * Button to open the network manager
   */
  get openNetworkManagerButton(): DetoxElement {
    return Matchers.getElementByID(
      NetworkManagerSelectorIDs.OPEN_NETWORK_MANAGER,
    );
  }

  /**
   * Select the bottom sheet of the network manager
   */
  get networkManagerBottomSheet(): DetoxElement {
    return Matchers.getElementByID(
      NetworkManagerSelectorIDs.NETWORK_MANAGER_BOTTOM_SHEET,
    );
  }

  /**
   * Select the tab of the popular networks
   */
  get popularNetworksTab(): DetoxElement {
    return Matchers.getElementByID(
      NetworkManagerSelectorIDs.POPULAR_NETWORKS_TAB,
    );
  }

  /**
   * Select the tab of the custom networks
   */
  get customNetworksTab(): DetoxElement {
    return Matchers.getElementByID(
      NetworkManagerSelectorIDs.CUSTOM_NETWORKS_TAB,
    );
  }

  /**
   * Select the container of the popular networks tab
   */
  get popularNetworksContainer(): DetoxElement {
    return Matchers.getElementByID(
      NetworkManagerSelectorIDs.POPULAR_NETWORKS_CONTAINER,
    );
  }

  /**
   * Select the container of the custom networks tab
   */
  get customNetworksContainer(): DetoxElement {
    return Matchers.getElementByID(
      NetworkManagerSelectorIDs.CUSTOM_NETWORKS_CONTAINER,
    );
  }

  /**
   * Select the button to select all popular networks
   */
  get selectAllPopularNetworksSelected(): DetoxElement {
    return Matchers.getElementByID(
      NetworkManagerSelectorIDs.SELECT_ALL_POPULAR_NETWORKS_SELECTED,
    );
  }

  /**
   * Select the button to select all popular networks
   */
  get selectAllPopularNetworksNotSelected(): DetoxElement {
    return Matchers.getElementByID(
      NetworkManagerSelectorIDs.SELECT_ALL_POPULAR_NETWORKS_NOT_SELECTED,
    );
  }

  /**
   * Select the network by name wether it is selected or not
   */
  getNetworkByName(networkName: string): DetoxElement {
    return Matchers.getElementByID(
      new RegExp(
        `^popular-network-list-item-${networkName}-(selected|not-selected)$`,
      ),
    );
  }

  /**
   * Select the network by name if it is selected
   */
  getSelectedNetworkByName(networkName: string): DetoxElement {
    return Matchers.getElementByID(
      `popular-network-list-item-${networkName}-selected`,
    );
  }

  /**
   * Select the network by name if it is not selected
   */
  getNotSelectedNetworkByName(networkName: string): DetoxElement {
    return Matchers.getElementByID(
      `popular-network-list-item-${networkName}-not-selected`,
    );
  }

  /**
   * Tap the network by name
   */
  async tapNetwork(networkName: string) {
    const elem = this.getNetworkByName(networkName);
    await Gestures.waitAndTap(elem, {
      elemDescription: `NetworkManager - tapping network: ${networkName}`,
    });
  }

  /**
   * Open the network manager
   */
  async openNetworkManager(): Promise<void> {
    await Gestures.waitAndTap(this.openNetworkManagerButton, {
      elemDescription: 'Open Network Manager Button',
    });
  }

  /**
   * Close the network manager
   */
  async closeNetworkManager(): Promise<void> {
    // swipe down on the bottom sheet
    await Gestures.swipe(this.networkManagerBottomSheet, 'down', {
      speed: 'fast',
    });
    // wait for the bottom sheet to be closed
    await Assertions.expectElementToNotBeVisible(
      this.networkManagerBottomSheet,
      {
        description: 'Network Manager Bottom Sheet should be hidden',
      },
    );
  }
}

export default new NetworkManager();
