import TestHelpers from '../../../helpers';
import {
  INPUT_NETWORK_NAME,
  INPUT_RPC_URL_FIELD,
  INPUT_CHAIN_ID_FIELD,
  NETWORKS_SYMBOL_INPUT_FIELD,
  RPC_WARNING_BANNER_ID,
  NETWORK_SCREEN_ID,
  CUSTOM_NETWORK_NAME_NETWORK_LIST,
} from '../../../../wdio/screen-objects/testIDs/Screens/NetworksScreen.testids';
import {
  NetworksViewSelectorsIDs,
  NetworkViewSelectorsText,
} from '../../../selectors/Settings/NetworksView.selectors';

export default class NetworkView {
  static async tapAddNetworkButton() {
    if (device.getPlatform() === 'ios') {
      await TestHelpers.tap(NetworksViewSelectorsIDs.ADD_NETWORKS_BUTTON);
    } else {
      await TestHelpers.waitAndTapByLabel(
        NetworksViewSelectorsIDs.ADD_NETWORKS_BUTTON,
      );
    }
  }

  static async switchToCustomNetworks() {
    await TestHelpers.waitAndTapText(
      NetworkViewSelectorsText.CUSTOM_NETWORK_TAB,
    );
  }

  static async tapPopularNetworkByName(networkName) {
    await TestHelpers.tapByText(networkName);
  }
  static async typeInNetworkName(networkName) {
    await TestHelpers.typeTextAndHideKeyboard(INPUT_NETWORK_NAME, networkName);
  }
  static async typeInRpcUrl(rPCUrl) {
    await TestHelpers.typeTextAndHideKeyboard(INPUT_RPC_URL_FIELD, rPCUrl);
  }
  static async typeInChainId(chainID) {
    await TestHelpers.typeTextAndHideKeyboard(INPUT_CHAIN_ID_FIELD, chainID);
  }
  static async typeInNetworkSymbol(networkSymbol) {
    await TestHelpers.typeTextAndHideKeyboard(
      NETWORKS_SYMBOL_INPUT_FIELD,
      networkSymbol,
    );
  }

  static async clearRpcInputBox() {
    await TestHelpers.clearField(INPUT_RPC_URL_FIELD);
  }

  static async tapRpcNetworkAddButton() {
    if (device.getPlatform() === 'android') {
      await TestHelpers.waitAndTapByLabel(
        NetworksViewSelectorsIDs.ADD_CUSTOM_NETWORK_BUTTON,
      ); // make me better
    } else {
      await TestHelpers.waitAndTap(
        NetworksViewSelectorsIDs.ADD_CUSTOM_NETWORK_BUTTON,
      );
    }
  }

  static async swipeToRPCTitleAndDismissKeyboard() {
    // Because in bitrise the keyboard is blocking the "Add" CTA
    await TestHelpers.waitAndTapByLabel(
      NetworkViewSelectorsText.BLOCK_EXPLORER,
    );
    await TestHelpers.delay(3000);
  }

  static async removeNetwork() {
    await TestHelpers.tapAndLongPressAtIndex(
      CUSTOM_NETWORK_NAME_NETWORK_LIST,
      0,
    );
    //Remove xDAI and verify removed on wallet view
    //Tap remove
    await TestHelpers.tapByText(NetworkViewSelectorsText.REMOVE_NETWORK);
  }

  static async isNetworkViewVisible() {
    await TestHelpers.checkIfVisible(NETWORK_SCREEN_ID);
  }

  static async isRpcViewVisible() {
    await TestHelpers.checkIfVisible(NetworksViewSelectorsIDs.CONTAINER);
  }

  static async isRPCWarningVisble() {
    await TestHelpers.checkIfVisible(RPC_WARNING_BANNER_ID);
  }
}
