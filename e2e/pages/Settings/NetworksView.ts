import {
  NetworksViewSelectorsIDs,
  NetworkViewSelectorsText,
} from '../../../app/components/Views/Settings/NetworksSettings/NetworksView.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { NetworkListModalSelectorsIDs } from '../../../app/components/Views/NetworkSelector/NetworkListModal.testIds';

class NetworkView {
  get networkContainer(): DetoxElement {
    return Matchers.getElementByID(NetworksViewSelectorsIDs.NETWORK_CONTAINER);
  }

  get networkFormContainer(): DetoxElement {
    return Matchers.getElementByID(NetworksViewSelectorsIDs.CONTAINER);
  }

  get rpcContainer(): DetoxElement {
    return Matchers.getElementByID(NetworksViewSelectorsIDs.RPC_CONTAINER);
  }

  get addNetworkButtonForm(): DetoxElement {
    return Matchers.getElementByID(NetworkListModalSelectorsIDs.ADD_BUTTON);
  }

  get addRpcDropDownButton(): DetoxElement {
    return Matchers.getElementByID(NetworksViewSelectorsIDs.ICON_BUTTON_RPC);
  }

  get addBlockExplorerDropDownButton(): DetoxElement {
    return Matchers.getElementByID(
      NetworksViewSelectorsIDs.ICON_BUTTON_BLOCK_EXPLORER,
    );
  }

  get addBlockExplorerButton(): DetoxElement {
    return Matchers.getElementByID(NetworksViewSelectorsIDs.ADD_BLOCK_EXPLORER);
  }

  get addRpcButton(): DetoxElement {
    return Matchers.getElementByID(NetworksViewSelectorsIDs.ADD_RPC_BUTTON);
  }

  get noMatchingText(): DetoxElement {
    return Matchers.getElementByText(
      NetworkViewSelectorsText.NO_MATCHING_SEARCH_RESULTS,
    );
  }

  get emptyPopularNetworksText(): DetoxElement {
    return Matchers.getElementByText(
      NetworkViewSelectorsText.EMPTY_POPULAR_NETWORKS,
    );
  }

  get closeIcon(): DetoxElement {
    return Matchers.getElementByID(NetworksViewSelectorsIDs.CLOSE_ICON);
  }

  get deleteNetworkButton(): DetoxElement {
    return Matchers.getElementByID(
      NetworksViewSelectorsIDs.REMOVE_NETWORK_BUTTON,
    );
  }

  get networkSearchInput(): DetoxElement {
    return Matchers.getElementByID(
      NetworksViewSelectorsIDs.SEARCH_NETWORK_INPUT_BOX_ID,
    );
  }

  get addNetworkButton(): DetoxElement {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(NetworksViewSelectorsIDs.ADD_NETWORKS_BUTTON)
      : Matchers.getElementByLabel(
          NetworksViewSelectorsIDs.ADD_NETWORKS_BUTTON,
        );
  }

  get customNetworkTab(): DetoxElement {
    return Matchers.getElementByText(
      NetworkViewSelectorsText.CUSTOM_NETWORK_TAB,
    );
  }

  get networkNameInput(): DetoxElement {
    return Matchers.getElementByID(NetworksViewSelectorsIDs.NETWORK_NAME_INPUT);
  }

  get rpcURLInput(): DetoxElement {
    return Matchers.getElementByID(NetworksViewSelectorsIDs.RPC_URL_INPUT);
  }

  get chainIDInput(): DetoxElement {
    return Matchers.getElementByID(NetworksViewSelectorsIDs.CHAIN_INPUT);
  }

  get networkSymbolInput(): DetoxElement {
    return Matchers.getElementByID(
      NetworksViewSelectorsIDs.NETWORKS_SYMBOL_INPUT,
    );
  }

  get networkBlockExplorerInput(): DetoxElement {
    return Matchers.getElementByID(
      NetworksViewSelectorsIDs.BLOCK_EXPLORER_INPUT,
    );
  }

  get rpcAddButton(): DetoxElement {
    return Matchers.getElementByID(
      NetworksViewSelectorsIDs.ADD_CUSTOM_NETWORK_BUTTON,
    );
  }

  get blockExplorer(): DetoxElement {
    return Matchers.getElementByLabel(NetworkViewSelectorsText.BLOCK_EXPLORER);
  }

  get chainIdLabel(): DetoxElement {
    return Matchers.getElementByLabel(NetworkViewSelectorsText.CHAIN_ID_LABEL);
  }

  get rpcWarningBanner(): DetoxElement {
    return Matchers.getElementByID(NetworksViewSelectorsIDs.RPC_WARNING_BANNER);
  }

  get customNetworkList(): DetoxElement {
    return Matchers.getElementByID(
      NetworksViewSelectorsIDs.CUSTOM_NETWORK_LIST,
    );
  }

  get removeNetwork(): DetoxElement {
    return Matchers.getElementByText(NetworkViewSelectorsText.REMOVE_NETWORK);
  }

  get saveButton(): DetoxElement {
    return Matchers.getElementByText(NetworkViewSelectorsText.SAVE_BUTTON);
  }

  async getnetworkName(networkName: string): Promise<DetoxElement> {
    return Matchers.getElementByText(networkName);
  }
  async tapAddNetworkButton(): Promise<void> {
    await Gestures.waitAndTap(this.addNetworkButton);
  }

  async tapAddNetworkFormButton(): Promise<void> {
    await Gestures.waitAndTap(this.addNetworkButtonForm);
  }

  async tapRpcDropDownButton(): Promise<void> {
    await Gestures.waitAndTap(this.addRpcDropDownButton);
  }

  async tapBlockExplorerDownButton(): Promise<void> {
    await Gestures.waitAndTap(this.addBlockExplorerDropDownButton);
  }

  async tapBlockExplorerButton(): Promise<void> {
    await Gestures.waitAndTap(this.addBlockExplorerButton);
  }

  async tapAddRpcButton(): Promise<void> {
    await Gestures.waitAndTap(this.addRpcButton);
  }

  async switchToCustomNetworks(): Promise<void> {
    await Gestures.waitAndTap(this.customNetworkTab);
  }

  async tapNetworkByName(networkName: string): Promise<void> {
    const network = await this.getnetworkName(networkName);
    await Gestures.waitAndTap(network as unknown as DetoxElement);
  }

  async SearchNetworkName(networkName: string): Promise<void> {
    await Gestures.typeTextAndHideKeyboard(
      this.networkSearchInput,
      networkName,
    );
  }
  async longPressToRemoveNetwork(networkName: string): Promise<void> {
    const network = await this.getnetworkName(networkName);
    await Gestures.tapAndLongPress(network as unknown as DetoxElement);
    await Gestures.waitAndTap(this.removeNetwork);
  }

  async tapDeleteButton(): Promise<void> {
    await Gestures.waitAndTap(this.deleteNetworkButton);
  }

  async tapClearSearch(): Promise<void> {
    await Gestures.waitAndTap(this.closeIcon);
  }
  async closePopularNetwork(): Promise<void> {
    await Gestures.waitAndTap(this.closeIcon);
  }

  // CUSTOM NETWORK SCREEN
  async typeInNetworkName(networkName: string): Promise<void> {
    await Gestures.typeText(this.networkNameInput, networkName, {
      hideKeyboard: true,
      elemDescription: 'Network Name Input',
    });
  }
  async typeInRpcUrl(rPCUrl: string): Promise<void> {
    await Gestures.typeText(this.rpcURLInput, rPCUrl, {
      hideKeyboard: true,
      elemDescription: 'RPC URL Input',
    });
  }
  async typeInChainId(chainID: string): Promise<void> {
    await Gestures.typeText(this.chainIDInput, chainID, {
      hideKeyboard: true,
      elemDescription: 'Chain ID Input',
    });
  }

  async typeInNetworkSymbol(networkSymbol: string): Promise<void> {
    await Gestures.typeText(this.networkSymbolInput, networkSymbol, {
      hideKeyboard: true,
      elemDescription: 'Network Symbol Input',
    });
  }

  async typeInNetworkBlockExplorer(
    networkBlockExplorer: string,
  ): Promise<void> {
    await Gestures.typeText(
      this.networkBlockExplorerInput,
      networkBlockExplorer,
      {
        hideKeyboard: true,
        elemDescription: 'Network Block Explorer Input',
      },
    );
  }

  async clearRpcInputBox(): Promise<void> {
    await Gestures.typeText(this.rpcURLInput, '', {
      clearFirst: true,
      elemDescription: 'RPC URL Input',
    });
  }

  async tapRpcNetworkAddButton(): Promise<void> {
    await Gestures.waitAndTap(this.rpcAddButton, {
      elemDescription: 'RPC Network Add Button',
    });
  }

  async tapChainIDLabel(): Promise<void> {
    // Because in bitrise the keyboard is blocking the "Add" CTA
    await Gestures.waitAndTap(this.chainIdLabel, {
      elemDescription: 'Chain ID Label',
    });
  }

  async tapSave(): Promise<void> {
    device.getPlatform() === 'ios'
      ? await (async () => {
          //swipe to dismiss iOS keypad
          await Gestures.swipe(this.chainIDInput, 'up', {
            speed: 'fast',
          });
          await Gestures.dblTap(this.saveButton, {
            elemDescription: 'Double Tap Save Button',
          });
        })()
      : await Gestures.waitAndTap(this.saveButton, {
          elemDescription: 'Save Button',
        });
  }
}

export default new NetworkView();
