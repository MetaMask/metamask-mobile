import Selectors from '../helpers/Selectors';
import AppwrightSelectors from '../helpers/AppwrightSelectors';
import Gestures from '../helpers/Gestures';
import { expect as appwrightExpect } from 'appwright';
import {
  ADD_NETWORK_BUTTON,
  BLOCK_EXPLORER_FIELD,
  INPUT_CHAIN_ID_FIELD,
  INPUT_RPC_URL_FIELD,
  NAV_ANDROID_BACK_BUTTON,
  NETWORKS_SYMBOL_INPUT_FIELD,
  REMOVE_NETWORK_BUTTON,
} from './testIDs/Screens/NetworksScreen.testids';
import { NetworksViewSelectorsIDs } from '../../e2e/selectors/Settings/NetworksView.selectors';

class NetworksScreen {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  get container() {
    if (!this._device) {
      return Selectors.getElementByPlatform(NetworksViewSelectorsIDs.NETWORK_CONTAINER);
    } else {
      return AppwrightSelectors.getElementByID(this._device, NetworksViewSelectorsIDs.NETWORK_CONTAINER);
    }
  }

  get getPopularNetworksTab() {
    if (!this._device) {
      return Selectors.getElementByPlatform('POPULAR');
    } else {
      return AppwrightSelectors.getElementByText(this._device, 'POPULAR');
    }
  }

  get getCustomNetworks() {
    if (!this._device) {
      return Selectors.getElementByPlatform('CUSTOM NETWORKS');
    } else {
      return AppwrightSelectors.getElementByText(this._device, 'CUSTOM NETWORKS');
    }
  }

  get addNetworkButton() {
    if (!this._device) {
      return Selectors.getElementByPlatform(ADD_NETWORK_BUTTON);
    } else {
      return AppwrightSelectors.getElementByID(this._device, ADD_NETWORK_BUTTON);
    }
  }

  get addCustomNetworkButton() {
    if (!this._device) {
      return Selectors.getElementByPlatform(NetworksViewSelectorsIDs.ADD_CUSTOM_NETWORK_BUTTON);
    } else {
      return AppwrightSelectors.getElementByID(this._device, NetworksViewSelectorsIDs.ADD_CUSTOM_NETWORK_BUTTON);
    }
  }

  get networkNameInputField() {
    if (!this._device) {
      return Selectors.getElementByPlatform(NetworksViewSelectorsIDs.NETWORK_NAME_INPUT);
    } else {
      return AppwrightSelectors.getElementByID(this._device, NetworksViewSelectorsIDs.NETWORK_NAME_INPUT);
    }
  }

  get rpcURLInputField() {
    if (!this._device) {
      return Selectors.getElementByPlatform(INPUT_RPC_URL_FIELD);
    } else {
      return AppwrightSelectors.getElementByID(this._device, INPUT_RPC_URL_FIELD);
    }
  }

  get inputChainIdField() {
    if (!this._device) {
      return Selectors.getElementByPlatform(INPUT_CHAIN_ID_FIELD);
    } else {
      return AppwrightSelectors.getElementByID(this._device, INPUT_CHAIN_ID_FIELD);
    }
  }

  get inputNetworkSymbolField() {
    if (!this._device) {
      return Selectors.getElementByPlatform(NETWORKS_SYMBOL_INPUT_FIELD);
    } else {
      return AppwrightSelectors.getElementByID(this._device, NETWORKS_SYMBOL_INPUT_FIELD);
    }
  }

  get blockExplorerInputField() {
    if (!this._device) {
      return Selectors.getElementByPlatform(BLOCK_EXPLORER_FIELD);
    } else {
      return AppwrightSelectors.getElementByID(this._device, BLOCK_EXPLORER_FIELD);
    }
  }

  get removeNetworkButton() {
    if (!this._device) {
      return Selectors.getElementByPlatform(REMOVE_NETWORK_BUTTON);
    } else {
      return AppwrightSelectors.getElementByID(this._device, REMOVE_NETWORK_BUTTON);
    }
  }

  get networkScreenBackButton() {
    if (!this._device) {
      return Selectors.getElementByPlatform(NetworksViewSelectorsIDs.BACK_ARROW_BUTTON);
    } else {
      return AppwrightSelectors.getElementByID(this._device, NetworksViewSelectorsIDs.BACK_ARROW_BUTTON);
    }
  }

  get settingsPageAndroidBackButton() {
    if (!this._device) {
      return Selectors.getElementByPlatform(NAV_ANDROID_BACK_BUTTON);
    } else {
      return AppwrightSelectors.getElementByID(this._device, NAV_ANDROID_BACK_BUTTON);
    }
  }

  get saveNetworkButton() {
    if (!this._device) {
      return Selectors.getElementByPlatform(ADD_NETWORK_BUTTON);
    } else {
      return AppwrightSelectors.getElementByID(this._device, ADD_NETWORK_BUTTON);
    }
  }

  get closeNetworkScreen() {
    if (!this._device) {
      return Selectors.getElementByPlatform(NetworksViewSelectorsIDs.CLOSE_ICON);
    } else {
      return AppwrightSelectors.getElementByID(this._device, NetworksViewSelectorsIDs.CLOSE_ICON);
    }
  }

  async waitForDisplayed() {
    const element = await this.container;
    if (!this._device) {
      await element.waitForDisplayed();
    } else {
      await appwrightExpect(element).toBeVisible({ timeout: 10000 });
    }
  }

  async isPopularNetworksTabVisible() {
    const element = await this.getPopularNetworksTab;
    if (!this._device) {
      await element.waitForDisplayed();
    } else {
      await appwrightExpect(element).toBeVisible({ timeout: 10000 });
    }
  }

  async isCustomNetworksTabVisible() {
    const element = await this.getCustomNetworks;
    if (!this._device) {
      await element.waitForDisplayed();
    } else {
      await appwrightExpect(element).toBeVisible({ timeout: 10000 });
    }
  }

  async selectNetwork(network) {
    if (!this._device) {
      await Gestures.tapTextByXpath(network);
    } else {
      const networkElement = await AppwrightSelectors.getElementByText(this._device, network);
      await networkElement.tap();
    }
  }

  async tapAndHoldNetwork(network) {
    if (!this._device) {
      await Gestures.tapTextByXpath(network);
    } else {
      const networkElement = await AppwrightSelectors.getElementByText(this._device, network);
      await networkElement.tap();
    }
  }

  async tapAddNetworkButton() {
    const element = await this.addNetworkButton;
    if (!this._device) {
      await Gestures.waitAndTap(element);
    } else {
      await element.tap();
    }
  }

  async tapPopularNetworksTab() {
    const element = await this.getPopularNetworksTab;
    if (!this._device) {
      await Gestures.waitAndTap(element);
    } else {
      await element.tap();
    }
  }

  async tapCustomNetworksTab() {
    const element = await this.getCustomNetworks;
    if (!this._device) {
      await Gestures.waitAndTap(element);
    } else {
      await element.tap();
    }
  }

  async isNetworkNameVisible() {
    if (!this._device) {
      await expect(this.networkNameInputField).toBeDisplayed();
    } else {
      await appwrightExpect(this.networkNameInputField).toBeVisible({ timeout: 10000 });
    }
  }

  async typeIntoNetworkName(text) {
    const element = await this.networkNameInputField;
    if (!this._device) {
      await Gestures.typeText(element, text);
    } else {
      await element.fill(text);
    }
  }

  async isRPCUrlFieldVisible() {
    if (!this._device) {
      await expect(this.rpcURLInputField).toBeDisplayed();
    } else {
      await appwrightExpect(this.rpcURLInputField).toBeVisible({ timeout: 10000 });
    }
  }

  async typeIntoRPCURLField(text) {
    const element = await this.rpcURLInputField;
    if (!this._device) {
      await Gestures.typeText(element, text);
    } else {
      await element.fill(text);
    }
  }

  async isChainIDInputVisible() {
    if (!this._device) {
      await expect(this.inputChainIdField).toBeDisplayed();
    } else {
      await appwrightExpect(this.inputChainIdField).toBeVisible({ timeout: 10000 });
    }
  }

  async typeIntoCHAINIDInputField(text) {
    if (!this._device) {
      await driver.touchPerform([{ action: 'tap', options: { x: 399, y: 400 } }]);
      await Gestures.typeText(this.inputChainIdField, text);
    } else {
      await this._device.tap({ x: 399, y: 400 });
      const element = await this.inputChainIdField;
      await element.fill(text);
    }
  }

  async isNetworkSymbolFieldVisible() {
    if (!this._device) {
      await expect(this.inputNetworkSymbolField).toBeDisplayed();
    } else {
      await appwrightExpect(this.inputNetworkSymbolField).toBeVisible({ timeout: 10000 });
    }
  }

  async typeIntoNetworkSymbol(text) {
    const element = await this.inputNetworkSymbolField;
    if (!this._device) {
      await Gestures.typeText(element, text);
    } else {
      await element.fill(text);
    }
  }

  async isBlockExplorerUrlVisible() {
    if (!this._device) {
      await expect(this.blockExplorerInputField).toBeDisplayed();
    } else {
      await appwrightExpect(this.blockExplorerInputField).toBeVisible({ timeout: 10000 });
    }
  }

  async addButtonNetworkIsdisabled() {
    if (!this._device) {
      await expect(this.addNetworkButton).toHaveAttrContaining(
        'clickable',
        'false',
      );
    } else {
      const element = await this.addNetworkButton;
      await appwrightExpect(element).toHaveAttribute('clickable', 'false');
    }
  }

  async tapCustomAddButton() {
    const element = await this.addCustomNetworkButton;
    if (!this._device) {
      await Gestures.waitAndTap(element);
    } else {
      await element.tap();
    }
  }

  async isDeleteNetworkButtonVisible() {
    if (!this._device) {
      await expect(this.removeNetworkButton).toBeDisplayed();
    } else {
      await appwrightExpect(this.removeNetworkButton).toBeVisible({ timeout: 10000 });
    }
  }

  async tapDeleteNetworkButton() {
    const element = await this.removeNetworkButton;
    if (!this._device) {
      await Gestures.waitAndTap(element);
    } else {
      await element.tap();
    }
  }

  async tapSaveNetworkButton() {
    const element = await this.saveNetworkButton;
    if (!this._device) {
      await Gestures.tap(element);
    } else {
      await element.tap();
    }
  }

  async isSaveNetworkButtonVisible() {
    if (!this._device) {
      await expect(this.saveNetworkButton).toBeDisplayed();
    } else {
      await appwrightExpect(this.saveNetworkButton).toBeVisible({ timeout: 10000 });
    }
  }

  async tapRemoveNetworkButton(text) {
    if (!this._device) {
      await Gestures.tapTextByXpath(text);
    } else {
      const element = await AppwrightSelectors.getElementByText(this._device, text);
      await element.tap();
    }
  }

  async isButtonTextVisibleByXpath(text) {
    if (!this._device) {
      expect(await Selectors.getXpathElementByText(text)).toBeDisplayed();
    } else {
      const element = await AppwrightSelectors.getElementByText(this._device, text);
      await appwrightExpect(element).toBeVisible({ timeout: 10000 });
    }
  }

  async isNetworkRemoved(network) {
    if (!this._device) {
      const element = await Selectors.getXpathElementByText(network);
      await element.waitForExist({ reverse: true });
    } else {
      const element = await AppwrightSelectors.getElementByText(this._device, network);
      await appwrightExpect(element).not.toBeVisible({ timeout: 10000 });
    }
  }

  async tapOnNetwork(network) {
    if (!this._device) {
      await Gestures.tapTextByXpath(network);
    } else {
      const element = await AppwrightSelectors.getElementByText(this._device, network);
      await element.tap();
    }
  }

  async isNetworkVisible(network) {
    if (!this._device) {
      const networkElement = await Selectors.getXpathElementByText(network);
      await networkElement.waitForDisplayed();
    } else {
      const networkElement = await AppwrightSelectors.getElementByText(this._device, network);
      await appwrightExpect(networkElement).toBeVisible({ timeout: 10000 });
    }
  }

  async isNetworkNotVisible(text) {
    if (!this._device) {
      const networkElement = await Selectors.getXpathElementByText(text);
      await networkElement.waitForExist({ reverse: true });
    } else {
      const networkElement = await AppwrightSelectors.getElementByText(this._device, text);
      await appwrightExpect(networkElement).not.toBeVisible({ timeout: 10000 });
    }
  }

  async tapOptionInSettings(text) {
    if (!this._device) {
      await Gestures.tapTextByXpath(text);
    } else {
      const element = await AppwrightSelectors.getElementByText(this._device, text);
      await element.tap();
    }
  }

  async isNetworknameDisplayed(network) {
    if (!this._device) {
      expect(await Selectors.getXpathElementByText(network)).toBeDisplayed();
    } else {
      const element = await AppwrightSelectors.getElementByText(this._device, network);
      await appwrightExpect(element).toBeVisible({ timeout: 10000 });
    }
  }

  async tapBackButtonInNewScreen() {
    const element = await this.networkScreenBackButton;
    if (!this._device) {
      await Gestures.waitAndTap(element);
    } else {
      await element.tap();
    }
  }

  async tapBackButtonInSettingsScreen() {
    const element = await this.settingsPageAndroidBackButton;
    if (!this._device) {
      await Gestures.waitAndTap(element);
    } else {
      await element.tap();
    }
  }

  async tapCloseNetworkScreen() {
    const element = await this.closeNetworkScreen;
    if (!this._device) {
      await Gestures.waitAndTap(element);
    } else {
      await element.tap();
    }
  }

  async tapBackButton() {
    const element = await this.networkScreenBackButton;
    if (!this._device) {
      await Gestures.waitAndTap(element);
    } else {
      await element.tap();
    }
  }
}

export default new NetworksScreen();
