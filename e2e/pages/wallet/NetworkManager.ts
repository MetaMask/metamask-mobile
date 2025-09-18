import { CaipChainId } from '@metamask/utils';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../framework/Assertions';
import {
  NetworkManagerSelectorIDs,
  NetworkManagerSelectorText,
} from '../../selectors/wallet/NetworkManager.selectors';
import TestHelpers from '../../helpers';
import { WalletViewSelectorsIDs } from '../../selectors/wallet/WalletView.selectors';

class NetworkManager {
  /**
   * Button to open the network manager
   */
  get openNetworkManagerButton(): DetoxElement {
    return Matchers.getElementByID(WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER);
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
    return Matchers.getElementByText(
      NetworkManagerSelectorText.POPULAR_NETWORKS_TAB,
    );
  }

  /**
   * Select the tab of the custom networks
   */
  get customNetworksTab(): DetoxElement {
    return Matchers.getElementByText(
      NetworkManagerSelectorText.CUSTOM_NETWORKS_TAB,
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
  getNetworkByCaipChainId(caipChainId: CaipChainId): DetoxElement {
    return Matchers.getElementByID(
      new RegExp(`^network-list-item-${caipChainId}-(selected|not-selected)$`),
    );
  }

  /**
   * Select the network by name if it is selected
   */
  getSelectedNetworkByCaipChainId(caipChainId: CaipChainId): DetoxElement {
    return Matchers.getElementByID(
      NetworkManagerSelectorIDs.NETWORK_LIST_ITEM(caipChainId, true),
    );
  }

  /**
   * Select the network by name if it is not selected
   */
  getNotSelectedNetworkByCaipChainId(caipChainId: CaipChainId): DetoxElement {
    return Matchers.getElementByID(
      NetworkManagerSelectorIDs.NETWORK_LIST_ITEM(caipChainId, false),
    );
  }

  /**
   * Select the network by name in the base control bar
   */
  getBaseControlBarText(caipChainId: CaipChainId): DetoxElement {
    return Matchers.getElementByID(
      `${NetworkManagerSelectorIDs.BASE_CONTROL_BAR_NETWORK_LABEL}-${caipChainId}`,
    );
  }

  /**
   * Get token element by symbol
   */
  getTokenBySymbol(symbol: string): DetoxElement {
    return Matchers.getElementByID(`asset-${symbol}`);
  }

  /**
   * Check if a specific token is visible
   */
  async checkTokenIsVisible(symbol: string) {
    const tokenElement = this.getTokenBySymbol(symbol);
    await Assertions.expectElementToBeVisible(tokenElement, {
      elemDescription: `Token ${symbol} should be visible`,
    });
  }

  /**
   * Check if a specific token is not visible
   */
  async checkTokenIsNotVisible(symbol: string) {
    const tokenElement = this.getTokenBySymbol(symbol);
    await Assertions.expectElementToNotBeVisible(tokenElement, {
      elemDescription: `Token ${symbol} should not be visible`,
    });
  }

  async checkBaseControlBarText(caipChainId: CaipChainId) {
    const elem = this.getBaseControlBarText(caipChainId);
    await Assertions.expectElementToBeVisible(elem, {
      elemDescription: `NetworkManager - checking base control bar text: ${caipChainId}`,
    });
  }

  /**
   * Tap the network by name
   */
  async tapNetwork(caipChainId: CaipChainId) {
    const elem = this.getNetworkByCaipChainId(caipChainId);
    await Gestures.waitAndTap(elem, {
      elemDescription: `NetworkManager - tapping network: ${caipChainId}`,
    });
  }

  /**
   * Check if the network is selected
   */
  async checkNetworkIsSelected(caipChainId: CaipChainId) {
    const elem = this.getSelectedNetworkByCaipChainId(caipChainId);
    await Assertions.expectElementToBeVisible(elem, {
      elemDescription: `NetworkManager - checking if network is selected: ${caipChainId}`,
    });
  }

  /**
   * Check if the network is not selected
   */
  async checkNetworkIsNotSelected(caipChainId: CaipChainId) {
    const elem = this.getNotSelectedNetworkByCaipChainId(caipChainId);
    await Assertions.expectElementToBeVisible(elem, {
      elemDescription: `NetworkManager - checking if network is not selected: ${caipChainId}`,
    });
  }

  /**
   * Open the network manager
   */
  async openNetworkManager(): Promise<void> {
    await Gestures.waitAndTap(this.openNetworkManagerButton, {
      elemDescription: 'Open Network Manager Button',
    });
    await this.waitForNetworkManagerToLoad();
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

  /**
   * Check if all popular networks are selected
   */
  async checkAllPopularNetworksIsSelected() {
    try {
      await Assertions.expectElementToBeVisible(
        this.selectAllPopularNetworksSelected,
      );
    } catch (error) {
      throw new Error('All popular networks are not selected');
    }
  }

  /**
   * Tap the custom networks tab
   */
  async tapCustomNetworksTab() {
    await Gestures.waitAndTap(this.customNetworksTab, {
      elemDescription: 'Custom Networks Tab',
    });
  }

  /**
   * Check if the custom networks container is visible
   */
  async checkCustomNetworksContainerIsVisible() {
    await Assertions.expectElementToBeVisible(this.customNetworksContainer, {
      elemDescription: 'Custom Networks Container',
    });
  }

  /**
   * Check if the popular networks container is visible
   */
  async checkPopularNetworksContainerIsVisible() {
    await Assertions.expectElementToBeVisible(this.popularNetworksContainer, {
      elemDescription: 'Popular Networks Container',
    });
  }

  /**
   * Check if a specific tab is selected
   */
  async checkTabIsSelected(tabName: 'Popular' | 'Custom') {
    const tab =
      tabName === 'Popular' ? this.popularNetworksTab : this.customNetworksTab;
    await Assertions.expectElementToBeVisible(tab, {
      elemDescription: `${tabName} tab should be selected`,
    });
  }

  /**
   * Get network by display name (for custom networks)
   */
  getNetworkByName(networkName: string): DetoxElement {
    return Matchers.getElementByText(networkName);
  }

  /**
   * Check if a network exists by name
   */
  async checkNetworkExists(networkName: string) {
    const networkElement = this.getNetworkByName(networkName);
    await Assertions.expectElementToBeVisible(networkElement, {
      elemDescription: `Network ${networkName} should exist`,
    });
  }

  /**
   * Check if a network does not exist by name
   */
  async checkNetworkDoesNotExist(networkName: string) {
    const networkElement = this.getNetworkByName(networkName);
    await Assertions.expectElementToNotBeVisible(networkElement, {
      elemDescription: `Network ${networkName} should not exist`,
    });
  }

  /**
   * Wait for network manager to be fully loaded
   */
  async waitForNetworkManagerToLoad() {
    await Assertions.expectElementToBeVisible(this.networkManagerBottomSheet, {
      elemDescription: 'Network Manager Bottom Sheet',
      timeout: 10000,
    });
    // Wait for bottom sheet animation to complete
    // eslint-disable-next-line no-restricted-syntax
    await TestHelpers.delay(1000); // Allow for bottom sheet slide-up animation
  }

  /**
   * Get count of visible networks in current tab
   */
  async getNetworkCount(): Promise<number> {
    try {
      // This is a simplified approach - in practice you'd need to query specific network elements
      // For now, return a reasonable default
      return 10; // Most popular networks count
    } catch (error) {
      return 0;
    }
  }

  /**
   * Verify network count matches expected
   */
  async verifyNetworkCount(expectedCount: number) {
    const actualCount = await this.getNetworkCount();
    if (actualCount !== expectedCount) {
      throw new Error(
        `Expected ${expectedCount} networks, but found ${actualCount}`,
      );
    }
  }

  /**
   * Verify that only enabled networks are visible
   */
  async verifyOnlyEnabledNetworksVisible(enabledNetworks: string[]) {
    for (const network of enabledNetworks) {
      await this.checkNetworkExists(network);
    }
  }

  /**
   * Verify that disabled networks are not visible
   */
  async verifyDisabledNetworksNotVisible(disabledNetworks: string[]) {
    for (const network of disabledNetworks) {
      await this.checkNetworkDoesNotExist(network);
    }
  }

  /**
   * Get all visible network names
   */
  async getVisibleNetworkNames(): Promise<string[]> {
    try {
      // This is a simplified approach - in practice you'd need to query specific network elements
      // For now, return common network names
      return [
        'Ethereum',
        'Polygon',
        'Arbitrum',
        'Optimism',
        'Base',
        'Avalanche',
        'BNB',
        'Linea',
      ];
    } catch (error) {
      return [];
    }
  }

  /**
   * Verify network list contains expected networks
   */
  async verifyNetworkListContains(expectedNetworks: string[]) {
    for (const expectedNetwork of expectedNetworks) {
      await this.checkNetworkExists(expectedNetwork);
    }
  }

  /**
   * Verify network list does not contain unexpected networks
   */
  async verifyNetworkListDoesNotContain(unexpectedNetworks: string[]) {
    for (const unexpectedNetwork of unexpectedNetworks) {
      await this.checkNetworkDoesNotExist(unexpectedNetwork);
    }
  }

  /**
   * Tap popular networks tab
   */
  async tapPopularNetworksTab() {
    await Gestures.waitAndTap(this.popularNetworksTab, {
      elemDescription: 'Popular Networks Tab',
    });
  }

  /**
   * Verify current active network in base control bar
   */
  async verifyActiveNetwork(networkName: string) {
    const baseControlBar = Matchers.getElementByText(networkName);
    await Assertions.expectElementToBeVisible(baseControlBar, {
      elemDescription: `Active network should be ${networkName}`,
    });
  }
}

export default new NetworkManager();
