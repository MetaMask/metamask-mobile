import TestHelpers from '../../../helpers';
import {
  RPC_VIEW_CONTAINER_ID,
  ADD_CUSTOM_RPC_NETWORK_BUTTON_ID,
  ADD_NETWORKS_ID,
} from '../../../../app/constants/test-ids';
import {
  NETWORK_BACK_ARROW_BUTTON_ID,
  INPUT_NETWORK_NAME,
  INPUT_RPC_URL_FIELD,
  INPUT_CHAIN_ID_FIELD,
  NETWORKS_SYMBOL_INPUT_FIELD,
  RPC_WARNING_BANNER_ID,
  NETWORK_SCREEN_ID,
  CUSTOM_NETWORK_NAME_NETWORK_LIST,
} from '../../../../wdio/screen-objects/testIDs/Screens/NetworksScreen.testids';
import messages from '../../../../locales/languages/en.json';

const BLOCK_EXPLORER_LABEL_TEXT =
  messages.app_settings.network_block_explorer_label;
const REMOVE_NETWORK_TEXT = messages.app_settings.remove_network;
const CUSTOM_NETWORK_TAB_TEXT =
  messages.app_settings.custom_network_name.toUpperCase();
const POPULAR_NETWORK_TAB_TEXT = messages.app_settings.popular.toUpperCase();

export default class NetworkView {
  static async tapAddNetworkButton() {
    if (device.getPlatform() === 'ios') {
      await TestHelpers.tap(ADD_NETWORKS_ID);
    } else {
      await TestHelpers.waitAndTapByLabel(ADD_NETWORKS_ID);
    }
  }

  static async switchToCustomNetworks() {
    await TestHelpers.waitAndTapText(CUSTOM_NETWORK_TAB_TEXT);
  }

  static async switchToPopularNetworks() {
    await TestHelpers.waitAndTapText(POPULAR_NETWORK_TAB_TEXT);
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
      await TestHelpers.waitAndTapByLabel(ADD_CUSTOM_RPC_NETWORK_BUTTON_ID); // make me better
    } else {
      await TestHelpers.waitAndTap(ADD_CUSTOM_RPC_NETWORK_BUTTON_ID);
    }
  }

  static async swipeToRPCTitleAndDismissKeyboard() {
    // Because in bitrise the keyboard is blocking the "Add" CTA
    await TestHelpers.waitAndTapByLabel(BLOCK_EXPLORER_LABEL_TEXT);
    await TestHelpers.delay(3000);
  }

  static async removeNetwork() {
    await TestHelpers.tapAndLongPressAtIndex(
      CUSTOM_NETWORK_NAME_NETWORK_LIST,
      0,
    );
    //Remove xDAI and verify removed on wallet view
    //Tap remove
    await TestHelpers.tapByText(REMOVE_NETWORK_TEXT);
  }
  static async tapBackButtonAndReturnToMainSettings() {
    // Go back to wallet screen
    if (device.getPlatform() === 'ios') {
      // Tap on back arrow
      await TestHelpers.waitAndTap(NETWORK_BACK_ARROW_BUTTON_ID);
    } else {
      // Go Back for android
      await device.pressBack();
    }
  }

  static async isNetworkViewVisible() {
    await TestHelpers.checkIfVisible(NETWORK_SCREEN_ID);
  }

  static async networkViewNotVisible() {
    await TestHelpers.checkIfNotVisible(NETWORK_SCREEN_ID);
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
