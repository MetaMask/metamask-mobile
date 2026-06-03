import {
  NetworksViewSelectorsIDs,
  NetworkViewSelectorsText,
} from '../../../app/components/Views/Settings/NetworksSettings/NetworksView.testIds';
import Matchers from '../../framework/Matchers';
import { NetworkListModalSelectorsIDs } from '../../../app/components/Views/NetworkSelector/NetworkListModal.testIds';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class NetworkView {
  get networkContainer(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(NetworksViewSelectorsIDs.NETWORK_CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NetworksViewSelectorsIDs.NETWORK_CONTAINER,
        ),
    });
  }

  get networkFormContainer(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(NetworksViewSelectorsIDs.CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(NetworksViewSelectorsIDs.CONTAINER),
    });
  }

  get rpcContainer(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(NetworksViewSelectorsIDs.RPC_CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NetworksViewSelectorsIDs.RPC_CONTAINER,
        ),
    });
  }

  get addNetworkButtonForm(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(NetworkListModalSelectorsIDs.ADD_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NetworkListModalSelectorsIDs.ADD_BUTTON,
        ),
    });
  }

  get addRpcDropDownButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(NetworksViewSelectorsIDs.ICON_BUTTON_RPC),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NetworksViewSelectorsIDs.ICON_BUTTON_RPC,
        ),
    });
  }

  get addBlockExplorerDropDownButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          NetworksViewSelectorsIDs.ICON_BUTTON_BLOCK_EXPLORER,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NetworksViewSelectorsIDs.ICON_BUTTON_BLOCK_EXPLORER,
        ),
    });
  }

  get addBlockExplorerButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(NetworksViewSelectorsIDs.ADD_BLOCK_EXPLORER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NetworksViewSelectorsIDs.ADD_BLOCK_EXPLORER,
        ),
    });
  }

  get addRpcButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(NetworksViewSelectorsIDs.ADD_RPC_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NetworksViewSelectorsIDs.ADD_RPC_BUTTON,
        ),
    });
  }

  get noMatchingText(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          NetworkViewSelectorsText.NO_MATCHING_SEARCH_RESULTS,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          NetworkViewSelectorsText.NO_MATCHING_SEARCH_RESULTS,
        ),
    });
  }

  get emptyPopularNetworksText(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          NetworkViewSelectorsText.EMPTY_POPULAR_NETWORKS,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          NetworkViewSelectorsText.EMPTY_POPULAR_NETWORKS,
        ),
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
        Matchers.getElementByID(NetworksViewSelectorsIDs.REMOVE_NETWORK_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NetworksViewSelectorsIDs.REMOVE_NETWORK_BUTTON,
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

  get addNetworkButton(): DetoxElement {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(NetworksViewSelectorsIDs.ADD_NETWORKS_BUTTON)
      : Matchers.getElementByLabel(
          NetworksViewSelectorsIDs.ADD_NETWORKS_BUTTON,
        );
  }

  get customNetworkTab(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(NetworkViewSelectorsText.CUSTOM_NETWORK_TAB),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          NetworkViewSelectorsText.CUSTOM_NETWORK_TAB,
        ),
    });
  }

  get networkNameInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(NetworksViewSelectorsIDs.NETWORK_NAME_INPUT),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NetworksViewSelectorsIDs.NETWORK_NAME_INPUT,
        ),
    });
  }

  get rpcURLInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(NetworksViewSelectorsIDs.RPC_URL_INPUT),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NetworksViewSelectorsIDs.RPC_URL_INPUT,
        ),
    });
  }

  get chainIDInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(NetworksViewSelectorsIDs.CHAIN_INPUT),
      appium: () =>
        PlaywrightMatchers.getElementById(NetworksViewSelectorsIDs.CHAIN_INPUT),
    });
  }

  get networkSymbolInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(NetworksViewSelectorsIDs.NETWORKS_SYMBOL_INPUT),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NetworksViewSelectorsIDs.NETWORKS_SYMBOL_INPUT,
        ),
    });
  }

  get networkBlockExplorerInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(NetworksViewSelectorsIDs.BLOCK_EXPLORER_INPUT),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NetworksViewSelectorsIDs.BLOCK_EXPLORER_INPUT,
        ),
    });
  }

  get rpcAddButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          NetworksViewSelectorsIDs.ADD_CUSTOM_NETWORK_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NetworksViewSelectorsIDs.ADD_CUSTOM_NETWORK_BUTTON,
        ),
    });
  }

  get blockExplorer(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByLabel(NetworkViewSelectorsText.BLOCK_EXPLORER),
      appium: () =>
        PlaywrightMatchers.getElementByAccessibilityId(
          NetworkViewSelectorsText.BLOCK_EXPLORER,
        ),
    });
  }

  get chainIdLabel(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByLabel(NetworkViewSelectorsText.CHAIN_ID_LABEL),
      appium: () =>
        PlaywrightMatchers.getElementByAccessibilityId(
          NetworkViewSelectorsText.CHAIN_ID_LABEL,
        ),
    });
  }

  get rpcWarningBanner(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(NetworksViewSelectorsIDs.RPC_WARNING_BANNER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NetworksViewSelectorsIDs.RPC_WARNING_BANNER,
        ),
    });
  }

  get customNetworkList(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(NetworksViewSelectorsIDs.CUSTOM_NETWORK_LIST),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NetworksViewSelectorsIDs.CUSTOM_NETWORK_LIST,
        ),
    });
  }

  get removeNetwork(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(NetworkViewSelectorsText.REMOVE_NETWORK),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          NetworkViewSelectorsText.REMOVE_NETWORK,
        ),
    });
  }

  get saveButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(NetworkViewSelectorsText.SAVE_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          NetworkViewSelectorsText.SAVE_BUTTON,
        ),
    });
  }

  async getnetworkName(networkName: string): Promise<EncapsulatedElementType> {
    return Matchers.getElementByText(networkName);
  }
  async tapAddNetworkButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.addNetworkButton);
  }

  async tapAddNetworkFormButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.addNetworkButtonForm);
  }

  async tapRpcDropDownButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.addRpcDropDownButton);
  }

  async tapBlockExplorerDownButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.addBlockExplorerDropDownButton);
  }

  async tapBlockExplorerButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.addBlockExplorerButton);
  }

  async tapAddRpcButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.addRpcButton);
  }

  async switchToCustomNetworks(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.customNetworkTab);
  }

  async tapNetworkByName(networkName: string): Promise<void> {
    const network = await this.getnetworkName(networkName);
    await UnifiedGestures.waitAndTap(network as unknown as DetoxElement);
  }

  async SearchNetworkName(networkName: string): Promise<void> {
    await UnifiedGestures.typeText(this.networkSearchInput, networkName);
  }
  async longPressToRemoveNetwork(networkName: string): Promise<void> {
    const network = await this.getnetworkName(networkName);
    await UnifiedGestures.longPress(network as unknown as DetoxElement);
    await UnifiedGestures.waitAndTap(this.removeNetwork);
  }

  async tapDeleteButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.deleteNetworkButton);
  }

  async tapClearSearch(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.closeIcon);
  }
  async closePopularNetwork(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.closeIcon);
  }

  // CUSTOM NETWORK SCREEN
  async typeInNetworkName(networkName: string): Promise<void> {
    await UnifiedGestures.typeText(this.networkNameInput, networkName, {
      hideKeyboard: true,
      elemDescription: 'Network Name Input',
    });
  }
  async typeInRpcUrl(rPCUrl: string): Promise<void> {
    await UnifiedGestures.typeText(this.rpcURLInput, rPCUrl, {
      hideKeyboard: true,
      elemDescription: 'RPC URL Input',
    });
  }
  async typeInChainId(chainID: string): Promise<void> {
    await UnifiedGestures.typeText(this.chainIDInput, chainID, {
      hideKeyboard: true,
      elemDescription: 'Chain ID Input',
    });
  }

  async typeInNetworkSymbol(networkSymbol: string): Promise<void> {
    await UnifiedGestures.typeText(this.networkSymbolInput, networkSymbol, {
      hideKeyboard: true,
      elemDescription: 'Network Symbol Input',
    });
  }

  async typeInNetworkBlockExplorer(
    networkBlockExplorer: string,
  ): Promise<void> {
    await UnifiedGestures.typeText(
      this.networkBlockExplorerInput,
      networkBlockExplorer,
      {
        hideKeyboard: true,
        elemDescription: 'Network Block Explorer Input',
      },
    );
  }

  async clearRpcInputBox(): Promise<void> {
    await UnifiedGestures.typeText(this.rpcURLInput, '', {
      clearFirst: true,
      elemDescription: 'RPC URL Input',
    });
  }

  async tapRpcNetworkAddButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.rpcAddButton, {
      elemDescription: 'RPC Network Add Button',
    });
  }

  async tapChainIDLabel(): Promise<void> {
    // Because on CI the keyboard is blocking the "Add" CTA
    await UnifiedGestures.waitAndTap(this.chainIdLabel, {
      elemDescription: 'Chain ID Label',
    });
  }

  async tapSave(): Promise<void> {
    device.getPlatform() === 'ios'
      ? await (async () => {
          //swipe to dismiss iOS keypad
          await UnifiedGestures.swipe(this.chainIDInput, 'up', {
            speed: 'fast',
          });
          await UnifiedGestures.dblTap(this.saveButton, {
            elemDescription: 'Double Tap Save Button',
          });
        })()
      : await UnifiedGestures.waitAndTap(this.saveButton, {
          elemDescription: 'Save Button',
        });
  }
}

export default new NetworkView();
