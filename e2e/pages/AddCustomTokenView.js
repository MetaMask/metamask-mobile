import Gestures from '../utils/Gestures';
import Matchers from '../utils/Matchers';
import {
  CUSTOM_TOKEN_BACK_BUTTON_ID,
  CUSTOM_TOKEN_CONTAINER_ID,
  TOKEN_ADDRESS_INPUT_BOX_ID,
  TOKEN_ADDRESS_SYMBOL_ID,
  TOKEN_IMPORT_BUTTON_ID,
} from '../../wdio/screen-objects/testIDs/Screens/AddCustomToken.testIds';
import {
  NFT_ADDRESS_INPUT_BOX_ID,
  NFT_ADDRESS_WARNING_MESSAGE_ID,
  NFT_IDENTIFIER_INPUT_BOX_ID,
  NEXT_BUTTON_CUSTOM_IMPORT,
} from '../../wdio/screen-objects/testIDs/Screens/NFTImportScreen.testIds';
import { AddCustomTokenViewSelectorsText } from '../selectors/AddCustomTokenView.selectors';

class AddCustomTokenView {
  get importButton() {
    return Matchers.getElementByText(
      AddCustomTokenViewSelectorsText.IMPORT_BUTTON,
    );
  }

  get customTokenImportButton() {
    return device.getPlatform() === 'android'
      ? Matchers.getElementByLabel(TOKEN_IMPORT_BUTTON_ID)
      : Matchers.getElementByID(TOKEN_IMPORT_BUTTON_ID);
  }

  get backButton() {
    return Matchers.getElementByID(CUSTOM_TOKEN_BACK_BUTTON_ID);
  }

  get nextButton() {
    return Matchers.getElementByID(NEXT_BUTTON_CUSTOM_IMPORT);
  }

  get tokenSymbolInputBox() {
    return Matchers.getElementByID(TOKEN_ADDRESS_SYMBOL_ID);
  }

  get tokenSymbolText() {
    return Matchers.getElementByText(
      AddCustomTokenViewSelectorsText.TOKEN_SYMBOL,
    );
  }

  get tokenAddressInputBox() {
    return Matchers.getElementByID(TOKEN_ADDRESS_INPUT_BOX_ID);
  }

  get nftAddressInputBox() {
    return Matchers.getElementByID(NFT_ADDRESS_INPUT_BOX_ID);
  }

  get nftIdentifierInputBox() {
    return Matchers.getElementByID(NFT_IDENTIFIER_INPUT_BOX_ID);
  }

  get customTokenContainer() {
    return Matchers.getElementByID(CUSTOM_TOKEN_CONTAINER_ID);
  }

  get nftAddressWarningMessage() {
    return Matchers.getElementByID(NFT_ADDRESS_WARNING_MESSAGE_ID);
  }

  get customTokenTab() {
    return Matchers.getElementByText(
      AddCustomTokenViewSelectorsText.CUSTOM_TOKEN_TAB,
    );
  }

  async tapImportButton() {
    await Gestures.waitAndTap(this.importButton);
  }

  async tapCustomTokenImportButton() {
    await Gestures.delay(1500);
    await Gestures.waitAndTap(this.customTokenImportButton);
  }

  async tapBackButton() {
    await Gestures.tap(this.backButton);
  }

  async tapNextButton() {
    await Gestures.tap(this.nextButton);
  }

  async tapTokenSymbolInputBox() {
    await Gestures.waitAndTap(this.tokenSymbolInputBox);
  }

  async tapTokenSymbolText() {
    await Gestures.tap(this.tokenSymbolText);
  }

  async scrollDownOnImportCustomTokens() {
    await Gestures.swipe(this.tokenSymbolInputBox, 'up', 'slow', 0.6);
  }

  async typeTokenAddress(address) {
    if (device.getPlatform() === 'android') {
      await Gestures.replaceTextInField(this.tokenAddressInputBox, address);
      await this.tokenAddressInputBox.tapReturnKey();
    } else {
      await Gestures.typeTextAndHideKeyboard(
        this.tokenAddressInputBox,
        address,
      );
    }
  }

  async typeInNFTAddress(address) {
    if (device.getPlatform() === 'android') {
      await Gestures.replaceTextInField(this.nftAddressInputBox, address);
      await this.nftAddressInputBox.tapReturnKey();
    } else {
      await Gestures.typeTextAndHideKeyboard(this.nftAddressInputBox, address);
    }
  }

  async typeInNFTIdentifier(identifier) {
    if (device.getPlatform() === 'android') {
      await Gestures.replaceTextInField(this.nftIdentifierInputBox, identifier);
      await this.nftIdentifierInputBox.tapReturnKey();
    } else {
      await Gestures.typeTextAndHideKeyboard(
        this.nftIdentifierInputBox,
        identifier,
      );
    }
  }

  async isVisible() {
    await Matchers.checkIfVisible(this.customTokenContainer);
  }

  async isNFTAddressWarningVisible() {
    await Matchers.checkIfVisible(this.nftAddressWarningMessage);
  }

  async switchToCustomTab() {
    await Gestures.tap(this.customTokenTab);
  }
}

export default new AddCustomTokenView();
