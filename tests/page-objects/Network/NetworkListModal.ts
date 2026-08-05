import {
  NetworkListModalSelectorsIDs,
  NetworkListModalSelectorsText,
} from '../../../app/components/Views/NetworkSelector/NetworkListModal.testIds';
import { NetworksViewSelectorsIDs } from '../../../app/components/Views/Settings/NetworksSettings/NetworksView.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { PlatformDetector } from '../../framework/PlatformLocator';
import { NETWORK_MULTI_SELECTOR_TEST_IDS } from '../../../app/components/UI/NetworkMultiSelector/NetworkMultiSelector.constants';
import { NetworkManagerSelectorIDs } from '../../../app/components/UI/NetworkMultiSelector/NetworkManager.testIds';
import { EncapsulatedElementType } from '../../framework';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';

class NetworkListModal {
  get networkScroll(): EncapsulatedElementType {
    return Matchers.getElementByID(NetworkListModalSelectorsIDs.SCROLL);
  }

  get closeIcon(): EncapsulatedElementType {
    return Matchers.getElementByID(NetworksViewSelectorsIDs.CLOSE_ICON);
  }

  get deleteNetworkButton(): EncapsulatedElementType {
    return Matchers.getElementByText(
      NetworkListModalSelectorsText.DELETE_NETWORK,
    );
  }

  get addPopularNetworkButton(): EncapsulatedElementType {
    return Matchers.getElementByText(
      NetworkListModalSelectorsText.ADD_POPULAR_NETWORK_BUTTON,
    );
  }

  get networkSearchInput(): EncapsulatedElementType {
    return Matchers.getElementByID(
      NetworksViewSelectorsIDs.SEARCH_NETWORK_INPUT_BOX_ID,
    );
  }

  get selectNetwork(): EncapsulatedElementType {
    return Matchers.getElementByText(
      NetworkListModalSelectorsText.SELECT_NETWORK,
    );
  }

  get testNetToggle(): EncapsulatedElementType {
    return Matchers.getElementByID(
      NetworkListModalSelectorsIDs.TEST_NET_TOGGLE,
    );
  }

  get deleteButton(): EncapsulatedElementType {
    return Matchers.getElementByID('delete-network-button');
  }

  get popularNetworksContainer(): EncapsulatedElementType {
    return Matchers.getElementByID(
      NETWORK_MULTI_SELECTOR_TEST_IDS.POPULAR_NETWORKS_CONTAINER,
    );
  }

  async getCustomNetwork(
    network: string,
    custom = false,
  ): Promise<EncapsulatedElementType> {
    if ((await PlatformDetector.isAndroid()) || !custom) {
      return Matchers.getElementByText(network);
    }

    return Matchers.getElementByID(
      NetworkListModalSelectorsIDs.CUSTOM_NETWORK_CELL(network),
    );
  }

  async tapDeleteButton(): Promise<void> {
    await Gestures.waitAndTap(this.deleteNetworkButton);
  }

  async confirmDeleteNetwork(): Promise<void> {
    await Gestures.waitAndTap(
      PlaywrightMatchers.getElementByText(
        NetworkListModalSelectorsText.DELETE_NETWORK,
        true,
      ),
      { elemDescription: 'Confirm delete network' },
    );
  }

  async scrollToTopOfNetworkList(): Promise<void> {
    await Gestures.swipe(this.networkScroll, 'down', {
      speed: 'fast',
    });
  }

  async changeNetworkTo(networkName: string, custom = false): Promise<void> {
    const elem = await this.getCustomNetwork(networkName, custom);
    await Gestures.waitAndTap(elem as unknown as EncapsulatedElementType);
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
    await Gestures.waitAndTap(elem);
  }

  async scrollToBottomOfNetworkList(): Promise<void> {
    await Gestures.swipe(this.networkScroll, 'up', {
      speed: 'fast',
      checkStability: true,
    });
  }

  async swipeToDismissModal(): Promise<void> {
    await Gestures.swipe(this.selectNetwork, 'down', {
      speed: 'slow',
      percentage: 0.9,
    });
  }

  async tapTestNetworkSwitch(): Promise<void> {
    await Gestures.tap(this.testNetToggle, {
      elemDescription: 'Test Network Switch',
      delay: 1500, // 1.5 seconds to ensure the network list is stable
    });
  }

  async longPressOnNetwork(networkName: string): Promise<void> {
    const network = Matchers.getElementByText(networkName);
    await Gestures.longPress(network);
  }

  async SearchNetworkName(networkName: string): Promise<void> {
    await Gestures.typeText(this.networkSearchInput, networkName, {
      hideKeyboard: true,
    });
  }

  async tapClearSearch(): Promise<void> {
    await Gestures.waitAndTap(this.closeIcon);
  }

  async tapAddNetworkButton(): Promise<void> {
    await Gestures.waitAndTap(this.addPopularNetworkButton);
  }
  async deleteNetwork(): Promise<void> {
    await Gestures.waitAndTap(this.deleteButton);
  }

  async scrollToBottomOfNetworkMultiSelector(): Promise<void> {
    await Gestures.swipe(this.popularNetworksContainer, 'up', {
      speed: 'fast',
      startOffsetPercentage: { x: 0.5, y: 0.25 },
    });
  }

  async tapNetworkMenuButton(networkName: string): Promise<void> {
    const networkCell = Matchers.getElementByText(networkName);
    await Gestures.waitAndTap(networkCell, {
      elemDescription: `Network ${networkName}`,
      checkVisibility: false,
      checkEnabled: false,
    });
  }

  async tapNetworkRowMenuButton(networkName: string): Promise<void> {
    const escapedName = networkName.replace(/'/g, "\\'");
    const menuId = 'button-menu-select-test-id';
    const menuButton = PlaywrightMatchers.getElementByXPath(
      `(//*[contains(@text,'${escapedName}') or contains(@content-desc,'${escapedName}') or contains(@name,'${escapedName}') or contains(@label,'${escapedName}')]/ancestor::*[contains(@resource-id,'network-list-item-') or contains(@name,'network-list-item-') or contains(@label,'network-list-item-')][1])//*[@resource-id='${menuId}' or @content-desc='${menuId}' or @name='${menuId}']`,
    );
    await Gestures.waitAndTap(menuButton, {
      elemDescription: `Network row menu button for ${networkName}`,
    });
  }

  async closeNetworkManager(): Promise<void> {
    const sheetId = NetworkManagerSelectorIDs.NETWORK_MANAGER_BOTTOM_SHEET;
    const closeButton = PlaywrightMatchers.getElementByXPath(
      `(//*[@resource-id='${sheetId}' or @content-desc='${sheetId}' or @name='${sheetId}' or @label='${sheetId}'])//*[@resource-id='button-icon' or @content-desc='button-icon' or @name='button-icon']`,
    );
    await Gestures.waitAndTap(closeButton, {
      elemDescription: 'Close NetworkManager bottom sheet',
    });
  }

  async tapOnCustomTab(): Promise<void> {
    const networkCell = Matchers.getElementByLabel('Custom');
    await Gestures.waitAndTap(networkCell);
  }

  async swipeToDismissNetworkMultiSelectorModal(): Promise<void> {
    await Gestures.swipe(Matchers.getElementByLabel('Custom'), 'down', {
      speed: 'fast',
      percentage: 0.3,
      startOffsetPercentage: { x: 0.5, y: 0.05 },
    });
  }
}

export default new NetworkListModal();
