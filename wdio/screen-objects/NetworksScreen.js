import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures';
import {
  ADD_NETWORK_BUTTON,
  BLOCK_EXPLORER_FIELD,
  INPUT_CHAIN_ID_FIELD,
  INPUT_NETWORK_NAME,
  INPUT_RPC_URL_FIELD,
  NAV_ANDROID_BACK_BUTTON,
  NETWORK_BACK_ARROW_BUTTON_ID,
  NETWORK_SCREEN_CLOSE_ICON,
  NETWORK_SCREEN_ID,
  NETWORKS_SYMBOL_INPUT_FIELD,
  REMOVE_NETWORK_BUTTON,
} from './testIDs/Screens/NetworksScreen.testids';
import { ADD_CUSTOM_RPC_NETWORK_BUTTON_ID } from '../../app/constants/test-ids';

class NetworksScreen {
  get container() {
    return Selectors.getElementByPlatform(NETWORK_SCREEN_ID);
  }

  get getPopularNetworksTab() {
    return Selectors.getElementByPlatform('POPULAR');
  }

  get getCustomNetworks() {
    return Selectors.getElementByPlatform('CUSTOM NETWORKS');
  }

  get addNetworkButton() {
    return Selectors.getElementByPlatform(ADD_NETWORK_BUTTON);
  }

  get addCustomNetworkButton() {
    return Selectors.getElementByPlatform(ADD_CUSTOM_RPC_NETWORK_BUTTON_ID);
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

  async waitForDisplayed() {
    const element = await this.container;
    await element.waitForDisplayed();
  }

  async isPopularNetworksTabVisible() {
    const element = await this.getPopularNetworksTab;
    await element.waitForDisplayed();
  }

  async isCustomNetworksTabVisible() {
    const element = await this.getCustomNetworks;
    await element.waitForDisplayed();
  }

  async selectNetwork(network) {
    await Gestures.tapTextByXpath(network);
  }

  async tapAndHoldNetwork(network) {
    await Gestures.tapTextByXpath(network);
  }

  async tapAddNetworkButton() {
    await Gestures.waitAndTap(this.addNetworkButton);
  }

  async tapPopularNetworksTab() {
    await Gestures.waitAndTap(this.getPopularNetworksTab);
  }

  async tapCustomNetworksTab() {
    await Gestures.waitAndTap(this.getCustomNetworks);
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

  async tapCustomAddButton() {
    await Gestures.waitAndTap(this.addCustomNetworkButton);
  }


  async isDeleteNetworkButtonVisible() {
    await expect(this.removeNetworkButton).toBeDisplayed();
  }

  async tapDeleteNetworkButton() {
    await Gestures.waitAndTap(this.removeNetworkButton);
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
    const element = await Selectors.getXpathElementByText(network);
    await element.waitForExist({ reverse: true });
  }

  async tapOnNetwork(network) {
    await Gestures.tapTextByXpath(network);
  }

  async isNetworkVisible(network) {
    const networkElement = await Selectors.getXpathElementByText(network);
    await networkElement.waitForDisplayed();
  }

  async isNetworkNotVisible(text) {
    const networkElement = await Selectors.getXpathElementByText(text);
    await networkElement.waitForExist({ reverse: true });
  }

  async tapOptionInSettings(text) {
    await Gestures.tapTextByXpath(text);
  }

  async isNetworknameDisplayed(network) {
    expect(await Selectors.getXpathElementByText(network)).toBeDisplayed();
  }

  async tapBackButtonInNewScreen() {
    await Gestures.waitAndTap(this.networkScreenBackButton);
  }

  async tapBackButtonInSettingsScreen() {
    await Gestures.waitAndTap(this.settingsPageAndroidBackButton);
  }

  async tapCloseNetworkScreen() {
    await Gestures.waitAndTap(this.closeNetworkScreen);
  }

  async tapBackButton() {
    await Gestures.waitAndTap(this.networkScreenBackButton);
  }
}

export default new NetworksScreen();
