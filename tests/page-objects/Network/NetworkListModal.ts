import {
  NetworkListModalSelectorsIDs,
  NetworkListModalSelectorsText,
} from '../../../app/components/Views/NetworkSelector/NetworkListModal.testIds';
import { NetworksViewSelectorsIDs } from '../../../app/components/Views/Settings/NetworksSettings/NetworksView.testIds';
import Matchers from '../../framework/Matchers';
import { NETWORK_MULTI_SELECTOR_TEST_IDS } from '../../../app/components/UI/NetworkMultiSelector/NetworkMultiSelector.constants';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class NetworkListModal {
  get networkScroll(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(NetworkListModalSelectorsIDs.SCROLL),
      appium: () =>
        PlaywrightMatchers.getElementById(NetworkListModalSelectorsIDs.SCROLL),
    });
  }

  get closeIcon(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(NetworksViewSelectorsIDs.CLOSE_ICON),
      appium: () =>
        PlaywrightMatchers.getElementById(NetworksViewSelectorsIDs.CLOSE_ICON),
    });
  }

  get deleteNetworkButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(NetworkListModalSelectorsText.DELETE_NETWORK),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          NetworkListModalSelectorsText.DELETE_NETWORK,
        ),
    });
  }

  get addPopularNetworkButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          NetworkListModalSelectorsText.ADD_POPULAR_NETWORK_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          NetworkListModalSelectorsText.ADD_POPULAR_NETWORK_BUTTON,
        ),
    });
  }

  get networkSearchInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          NetworksViewSelectorsIDs.SEARCH_NETWORK_INPUT_BOX_ID,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NetworksViewSelectorsIDs.SEARCH_NETWORK_INPUT_BOX_ID,
        ),
    });
  }

  get selectNetwork(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(NetworkListModalSelectorsText.SELECT_NETWORK),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          NetworkListModalSelectorsText.SELECT_NETWORK,
        ),
    });
  }

  get testNetToggle(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(NetworkListModalSelectorsIDs.TEST_NET_TOGGLE),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NetworkListModalSelectorsIDs.TEST_NET_TOGGLE,
        ),
    });
  }

  get deleteButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID('delete-network-button'),
      appium: () => PlaywrightMatchers.getElementById('delete-network-button'),
    });
  }

  get popularNetworksContainer(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          NETWORK_MULTI_SELECTOR_TEST_IDS.POPULAR_NETWORKS_CONTAINER,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NETWORK_MULTI_SELECTOR_TEST_IDS.POPULAR_NETWORKS_CONTAINER,
        ),
    });
  }

  getCustomNetwork(network: string, custom = false): EncapsulatedElementType {
    if (device.getPlatform() === 'android' || !custom) {
      return Matchers.getElementByText(network);
    }

    return Matchers.getElementByID(
      NetworkListModalSelectorsIDs.CUSTOM_NETWORK_CELL(network),
    );
  }

  async tapDeleteButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.deleteNetworkButton);
  }

  async scrollToTopOfNetworkList(): Promise<void> {
    await UnifiedGestures.swipe(this.networkScroll, 'down', {
      speed: 'fast',
    });
  }

  async changeNetworkTo(networkName: string, custom = false): Promise<void> {
    const elem = this.getCustomNetwork(networkName, custom);
    await UnifiedGestures.waitAndTap(elem);
  }

  /**
   * Select a network inside the Custom networks tab.
   * Uses withAncestor to avoid matching background text elements
   * that may be partially obscured behind the modal.
   */
  async selectNetworkInCustomTab(networkName: string): Promise<void> {
    const elem = element(
      by
        .text(networkName)
        .withAncestor(
          by.id(NETWORK_MULTI_SELECTOR_TEST_IDS.CUSTOM_NETWORKS_CONTAINER),
        ),
    ) as unknown as DetoxElement;
    await UnifiedGestures.waitAndTap(elem);
  }

  async scrollToBottomOfNetworkList(): Promise<void> {
    await UnifiedGestures.swipe(this.networkScroll, 'up', {
      speed: 'fast',
      checkStability: true,
    });
  }

  async swipeToDismissModal(): Promise<void> {
    await UnifiedGestures.swipe(this.selectNetwork, 'down', {
      speed: 'slow',
      percentage: 0.9,
    });
  }

  async tapTestNetworkSwitch(): Promise<void> {
    await UnifiedGestures.tap(this.testNetToggle, {
      elemDescription: 'Test Network Switch',
      delay: 1500, // 1.5 seconds to ensure the network list is stable
    });
  }

  async longPressOnNetwork(networkName: string): Promise<void> {
    const network = Matchers.getElementByText(networkName);
    await UnifiedGestures.longPress(network);
  }

  async SearchNetworkName(networkName: string): Promise<void> {
    await UnifiedGestures.typeText(this.networkSearchInput, networkName, {
      hideKeyboard: true,
    });
  }

  async tapClearSearch(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.closeIcon);
  }

  async tapAddNetworkButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.addPopularNetworkButton);
  }
  async deleteNetwork(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.deleteButton);
  }

  async scrollToBottomOfNetworkMultiSelector(): Promise<void> {
    await UnifiedGestures.swipe(this.popularNetworksContainer, 'up', {
      speed: 'fast',
      startOffsetPercentage: { x: 0.5, y: 0.25 },
    });
  }

  async tapNetworkMenuButton(networkName: string): Promise<void> {
    const networkCell = Matchers.getElementByText(networkName);
    await UnifiedGestures.waitAndTap(networkCell, {
      elemDescription: `Network ${networkName}`,
      checkVisibility: false,
      checkEnabled: false,
    });
  }

  async tapOnCustomTab(): Promise<void> {
    const networkCell = Matchers.getElementByLabel('Custom');
    await UnifiedGestures.waitAndTap(networkCell);
  }

  async swipeToDismissNetworkMultiSelectorModal(): Promise<void> {
    await UnifiedGestures.swipe(Matchers.getElementByLabel('Custom'), 'down', {
      speed: 'fast',
      percentage: 0.3,
      startOffsetPercentage: { x: 0.5, y: 0.05 },
    });
  }
}

export default new NetworkListModal();
