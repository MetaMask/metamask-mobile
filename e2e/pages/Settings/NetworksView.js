import {
  NetworksViewSelectorsIDs,
  NetworkViewSelectorsText,
} from '../../selectors/Settings/NetworksView.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class NetworkView {
  get networkContainer() {
    return Matchers.getElementByID(NetworksViewSelectorsIDs.NETWORK_CONTAINER);
  }

  get rpcContainer() {
    return Matchers.getElementByID(NetworksViewSelectorsIDs.RPC_CONTAINER);
  }

  get noMatchingText() {
    return Matchers.getElementByText(
      NetworkViewSelectorsText.NO_MATCHING_SEARCH_RESULTS,
    );
  }

  get emptyPopularNetworksText() {
    return Matchers.getElementByText(
      NetworkViewSelectorsText.EMPTY_POPULAR_NETWORKS,
    );
  }

  get closeIcon() {
    return Matchers.getElementByID(NetworksViewSelectorsIDs.CLOSE_ICON);
  }

  get deleteNetworkButton() {
    return Matchers.getElementByID(
      NetworksViewSelectorsIDs.REMOVE_NETWORK_BUTTON,
    );
  }

  get networkSearchInput() {
    return Matchers.getElementByID(
      NetworksViewSelectorsIDs.SEARCH_NETWORK_INPUT_BOX_ID,
    );
  }

  get addNetworkButton() {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(NetworksViewSelectorsIDs.ADD_NETWORKS_BUTTON)
      : Matchers.getElementByLabel(
          NetworksViewSelectorsIDs.ADD_NETWORKS_BUTTON,
        );
  }

  get customNetworkTab() {
    return Matchers.getElementByText(
      NetworkViewSelectorsText.CUSTOM_NETWORK_TAB,
    );
  }

  get networkNameInput() {
    return Matchers.getElementByID(NetworksViewSelectorsIDs.NETWORK_NAME_INPUT);
  }

  get rpcURLInput() {
    return Matchers.getElementByID(NetworksViewSelectorsIDs.RPC_URL_INPUT);
  }

  get chainIDInput() {
    return Matchers.getElementByID(NetworksViewSelectorsIDs.CHAIN_INPUT);
  }

  get networkSymbolInput() {
    return Matchers.getElementByID(
      NetworksViewSelectorsIDs.NETWORKS_SYMBOL_INPUT,
    );
  }

  get rpcAddButton() {
    return device.getPlatform() === 'android'
      ? Matchers.getElementByLabel(
          NetworksViewSelectorsIDs.ADD_CUSTOM_NETWORK_BUTTON,
        )
      : Matchers.getElementByID(
          NetworksViewSelectorsIDs.ADD_CUSTOM_NETWORK_BUTTON,
        );
  }

  get blockExplorer() {
    return Matchers.getElementByLabel(NetworkViewSelectorsText.BLOCK_EXPLORER);
  }

  get chainIdLabel() {
    return Matchers.getElementByLabel(NetworkViewSelectorsText.CHAIN_ID_LABEL);
  }

  get rpcWarningBanner() {
    return Matchers.getElementByID(NetworksViewSelectorsIDs.RPC_WARNING_BANNER);
  }

  get customNetworkList() {
    return Matchers.getElementByID(
      NetworksViewSelectorsIDs.CUSTOM_NETWORK_LIST,
    );
  }

  get removeNetwork() {
    return Matchers.getElementByText(NetworkViewSelectorsText.REMOVE_NETWORK);
  }

  get saveButton() {
    return Matchers.getElementByText(NetworkViewSelectorsText.SAVE_BUTTON);
  }

  async getnetworkName(networkName) {
    return Matchers.getElementByText(networkName);
  }
  async tapAddNetworkButton() {
    await Gestures.waitAndTap(this.addNetworkButton);
  }

  async switchToCustomNetworks() {
    await Gestures.waitAndTap(this.customNetworkTab);
  }

  async tapNetworkByName(networkName) {
    const network = this.getnetworkName(networkName);
    await Gestures.waitAndTap(network);
  }

  async SearchNetworkName(networkName) {
    await Gestures.typeTextAndHideKeyboard(
      this.networkSearchInput,
      networkName,
    );
  }
  async longPressToRemoveNetwork(networkName) {
    const network = this.getnetworkName(networkName);
    await Gestures.tapAndLongPress(network);
    await Gestures.waitAndTap(this.removeNetwork);
  }

  async tapDeleteButton() {
    await Gestures.waitAndTap(this.deleteNetworkButton);
  }

  async tapClearSearch() {
    await Gestures.waitAndTap(this.closeIcon);
  }
  async closePopularNetwork() {
    await Gestures.waitAndTap(this.closeIcon);
  }

  // CUSTOM NETWORK SCREEN
  async typeInNetworkName(networkName) {
    await Gestures.typeTextAndHideKeyboard(this.networkNameInput, networkName);
  }
  async typeInRpcUrl(rPCUrl) {
    await Gestures.typeTextAndHideKeyboard(this.rpcURLInput, rPCUrl);
  }
  async typeInChainId(chainID) {
    await Gestures.typeTextAndHideKeyboard(this.chainIDInput, chainID);
  }

  async typeInNetworkSymbol(networkSymbol) {
    await Gestures.typeTextAndHideKeyboard(
      this.networkSymbolInput,
      networkSymbol,
    );
  }

  async clearRpcInputBox() {
    await Gestures.clearField(this.rpcURLInput);
  }

  async tapRpcNetworkAddButton() {
    await Gestures.waitAndTap(this.rpcAddButton);
  }

  async tapChainIDLabel() {
    // Because in bitrise the keyboard is blocking the "Add" CTA
    await Gestures.waitAndTap(this.chainIdLabel);
  }

  async tapSave() {
    device.getPlatform() === 'ios'
      ? await (async () => {
          //swipe to dismiss iOS keypad
          await Gestures.swipe(this.chainIDInput, 'up', 'fast', 0.3);
          await Gestures.doubleTap(this.saveButton);
        })()
      : await Gestures.waitAndTap(this.saveButton);
  }
}

export default new NetworkView();
