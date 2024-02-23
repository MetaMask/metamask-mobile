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

  async tapAddNetworkButton() {
    await Gestures.waitAndTap(this.addNetworkButton);
  }

  async switchToCustomNetworks() {
    await Gestures.waitAndTap(this.customNetworkTab);
  }

  async tapPopularNetworkByName(networkName) {
    const network = Matchers.getElementByText(networkName);
    await Gestures.waitAndTap(network);
  }
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

  async swipeToRPCTitleAndDismissKeyboard() {
    // Because in bitrise the keyboard is blocking the "Add" CTA
    await Gestures.waitAndTap(this.blockExplorer);
  }

  async tapRemoveNetwork(networkName) {
    const network = Matchers.getElementByText(networkName);
    await Gestures.tapAndLongPress(network);
    await Gestures.waitAndTap(this.removeNetwork);
  }
}

export default new NetworkView();
