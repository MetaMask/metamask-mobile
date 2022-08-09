import TestHelpers from '../../../helpers';
import {
  RPC_VIEW_CONTAINER_ID,
  ADD_CUSTOM_RPC_NETWORK_BUTTON_ID,
  ADD_NETWORKS_ID,
} from '../../../../app/constants/test-ids';

const NETWORK_VIEW_CONTAINER_ID = 'networks-screen';
const RPC_NETWORK_NAME_ID = 'rpc-networks';

const NETWORK_NAME_INPUT_BOX_ID = 'input-network-name';
const RPC_URL_SYMBOL_INPUT_BOX_ID = 'input-rpc-url';
const CHAIN_ID_INPUT_BOX_ID = 'input-chain-id';
const NETWORKS_SYMBOL_INPUT_BOX_ID = 'input-network-symbol';
const RPC_WARNING_BANNER_ID = 'rpc-url-warning';

export default class NetworkView {
  static async tapAddNetworkButton() {
    await TestHelpers.tap(ADD_NETWORKS_ID);
  }

  static async switchToCustomNetworks() {
    await TestHelpers.tapByText('CUSTOM NETWORKS');
  }

  static async switchToPopularNetworks() {
    await TestHelpers.tapByText('POPULAR');
  }

  static async tapPopularNetworkByName(networkName) {
    await TestHelpers.tapByText(networkName);
  }

  static async tapNetworks() {
    await TestHelpers.tapByText('Networks');
  }
  static async typeInNetworkName(networkName) {
    await TestHelpers.typeTextAndHideKeyboard(
      NETWORK_NAME_INPUT_BOX_ID,
      networkName,
    );
  }
  static async typeInRpcUrl(rPCUrl) {
    await TestHelpers.typeTextAndHideKeyboard(
      RPC_URL_SYMBOL_INPUT_BOX_ID,
      rPCUrl,
    );
  }
  static async typeInChainId(chainID) {
    await TestHelpers.typeTextAndHideKeyboard(CHAIN_ID_INPUT_BOX_ID, chainID);
  }
  static async typeInNetworkSymbol(networkSymbol) {
    await TestHelpers.typeTextAndHideKeyboard(
      NETWORKS_SYMBOL_INPUT_BOX_ID,
      networkSymbol,
    );
  }

  static async clearRpcInputBox() {
    await TestHelpers.clearField(RPC_URL_SYMBOL_INPUT_BOX_ID);
  }

  static async tapRpcNetworkAddButton() {
    await TestHelpers.tap(ADD_CUSTOM_RPC_NETWORK_BUTTON_ID);
  }

  static async swipeToRPCTitleAndDismissKeyboard() {
    // Because in bitrise the keyboard is blocking the "Add" CTA

    //await TestHelpers.swipe(RPC_URL_SYMBOL_INPUT_BOX_ID, 'down', 'fast');
    await TestHelpers.tapByText('Block Explorer URL');
    await TestHelpers.delay(3000);
  }

  static async removeNetwork() {
    await TestHelpers.tapAndLongPressAtIndex(RPC_NETWORK_NAME_ID, 0);
    //Remove xDAI and verify removed on wallet view
    //Tap remove
    await TestHelpers.tapByText('Remove');
  }
  static async tapBackButtonAndReturnToWallet() {
    // Go back to wallet screen
    if (device.getPlatform() === 'ios') {
      // Tap on back arrow
      await TestHelpers.tap('nav-ios-back');
      // Tap close
      await TestHelpers.tapByText('Close');
    } else {
      // Go Back for android
      await TestHelpers.tap('nav-android-back');
      await TestHelpers.tap('nav-android-back');
    }
  }

  static async isNetworkViewVisible() {
    await TestHelpers.checkIfVisible(NETWORK_VIEW_CONTAINER_ID);
  }

  static async networkViewNotVisible() {
    await TestHelpers.checkIfNotVisible(NETWORK_VIEW_CONTAINER_ID);
  }

  static async isRpcViewVisible() {
    await TestHelpers.checkIfVisible(RPC_VIEW_CONTAINER_ID);
  }

  static async RpcViewNotVisible() {
    await TestHelpers.checkIfNotVisible(RPC_VIEW_CONTAINER_ID);
  }

  static async isRPCWarningVisble() {
    await TestHelpers.checkIfVisible(RPC_WARNING_BANNER_ID);
  }
}
