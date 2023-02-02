// eslint-disable-next-line no-unused-vars
/* global driver */
import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures';
import {
  INPUT_CHAIN_ID_FIELD,
  INPUT_RPC_URL_FIELD,
  ADD_NETWORK_BUTTON,
  INPUT_NETWORK_NAME,
  NETWORKS_SYMBOL_INPUT_FIELD,
  BLOCK_EXPLORER_FIELD,
  REMOVE_NETWORK_BUTTON,
  NETWORK_BACK_ARROW_BUTTON_ID,
  NAV_ANDROID_BACK_BUTTON,
  NETWORK_SCREEN_CLOSE_ICON,
} from './testIDs/Screens/NetworksScreen.testids';

class NetworksScreen {
  get getPopularNetworksTab() {
    return Selectors.getElementByPlatform('POPULAR');
  }

  get getCustomNetworks() {
    return Selectors.getElementByPlatform('CUSTOM NETWORKS');
  }

  get addNetworkButton() {
    return Selectors.getElementByPlatform(ADD_NETWORK_BUTTON);
  }

  get networkNameInputField() {
    return Selectors.getElementByPlatform(INPUT_NETWORK_NAME);
  }

  get rpcURLInputField() {
    return Selectors.getElementByPlatform(INPUT_RPC_URL_FIELD);
  }

  get inputChainIdField() {
    return Selectors.getElementByPlatform(INPUT_CHAIN_ID_FIELD);
  }

  get inputNetworkSymbolField() {
    return Selectors.getElementByPlatform(NETWORKS_SYMBOL_INPUT_FIELD);
  }

  get blockExplorerInputField() {
    return Selectors.getElementByPlatform(BLOCK_EXPLORER_FIELD);
  }

  get removeNetworkButton() {
    return Selectors.getElementByPlatform(REMOVE_NETWORK_BUTTON);
  }

  get networkScreenBackButton() {
    return Selectors.getElementByPlatform(NETWORK_BACK_ARROW_BUTTON_ID);
  }

  get settingsPageAndroidBackButton() {
    return Selectors.getElementByPlatform(NAV_ANDROID_BACK_BUTTON);
  }

  get saveNetworkButton() {
    return Selectors.getElementByPlatform(ADD_NETWORK_BUTTON);
  }

  get closeNetworkScreen() {
    return Selectors.getElementByPlatform(NETWORK_SCREEN_CLOSE_ICON);
  }

  async isPopularNetworksTabVisible() {
    await expect(this.getPopularNetworksTab).toBeDisplayed();
  }

  async isCustomNetworksTabVisible() {
    await expect(this.getCustomNetworks).toBeDisplayed();
  }

  async selectNetwork(network) {
    await Gestures.tapTextByXpath(network);
  }

  async tapAndHoldNetwork(network) {
    await Gestures.tapTextByXpath(network);
  }

  async tapAddNetworkButton() {
    await Gestures.tap(this.addNetworkButton);
  }

  async tapPopularNetworksTab() {
    await Gestures.tap(this.getPopularNetworksTab);
  }

  async tapCustomNetworksTab() {
    await Gestures.tap(this.getCustomNetworks);
  }

  async isNetworkNameVisible() {
    await expect(this.networkNameInputField).toBeDisplayed();
  }

  async typeIntoNetworkName(text) {
    await Gestures.typeText(this.networkNameInputField, text);
  }

  async isRPCUrlFieldVisible() {
    await expect(this.rpcURLInputField).toBeDisplayed();
  }

  async typeIntoRPCURLField(text) {
    await Gestures.typeText(this.rpcURLInputField, text);
  }

  async isChainIDInputVisible() {
    await expect(this.inputChainIdField).toBeDisplayed();
  }

  async typeIntoCHAINIDInputField(text) {
    await driver.touchPerform([{ action: 'tap', options: { x: 399, y: 400 } }]); // this eliminates some flakiness. The keyboard sometimes blocks the RPC url input
    await Gestures.typeText(this.inputChainIdField, text);
  }

  async isNetworkSymbolFieldVisible() {
    await expect(this.inputNetworkSymbolField).toBeDisplayed();
  }

  async typeIntoNetworkSymbol(text) {
    await Gestures.typeText(this.inputNetworkSymbolField, text);
  }

  async isBlockExplorerUrlVisible() {
    await expect(this.blockExplorerInputField).toBeDisplayed();
  }

  async addButtonNetworkIsdisabled() {
    await expect(this.addNetworkButton).toHaveAttrContaining(
      'clickable',
      'false',
    );
  }

  async tapAddButton() {
    await Gestures.tap(this.addNetworkButton);
  }

  async isDeleteNetworkButtonVisible() {
    await expect(this.removeNetworkButton).toBeDisplayed();
  }

  async tapDeleteNetworkButton() {
    await Gestures.tap(this.removeNetworkButton);
  }

  async tapSaveNetworkButton() {
    await Gestures.tap(this.saveNetworkButton);
  }

  async isSaveNetworkButtonVisible() {
    await expect(this.saveNetworkButton).toBeDisplayed();
  }

  async tapRemoveNetworkButton(text) {
    await Gestures.tapTextByXpath(text);
  }

  async isButtonTextVisibleByXpath(text) {
    expect(await Selectors.getXpathElementByText(text)).toBeDisplayed();
  }

  async isNetworkRemoved(network) {
    expect(await Selectors.getXpathElementByText(network)).not.toBeDisplayed();
  }

  async tapOnNetwork(network) {
    await Gestures.tapTextByXpath(network);
  }

  async isNetworkVisible(network) {
    expect(await Selectors.getXpathElementByText(network)).toBeDisplayed();
  }

  async isNetworkNotVisible(text) {
    expect(await Selectors.getXpathElementByText(text)).not.toBeDisplayed();
  }

  async tapOptionInSettings(text) {
    await Gestures.tapTextByXpath(text);
  }

  async isNetworknameDisplayed(network) {
    expect(await Selectors.getXpathElementByText(network)).toBeDisplayed();
  }

  async tapBackButtonInNewScreen() {
    driver.pause(2000);
    (
      await Selectors.getXpathElementByContentDescription(
        NETWORK_BACK_ARROW_BUTTON_ID,
      )
    ).touchAction('tap');
  }

  async tapBackButtonInSettingsScreen() {
    await Gestures.tap(this.settingsPageAndroidBackButton);
  }

  async tapCloseNetworkScreen() {
    await Gestures.tap(this.closeNetworkScreen);
  }
}

export default new NetworksScreen();
