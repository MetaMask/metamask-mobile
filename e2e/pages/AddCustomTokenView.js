import TestHelpers from '../helpers';
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

export default class AddCustomTokenView {
  static async tapImportButton() {
    //await TestHelpers.swipe(TOKEN_ADDRESS_SYMBOL_ID, 'up', 'slow', 0.6);
    await TestHelpers.waitAndTapText(
      AddCustomTokenViewSelectorsText.IMPORT_BUTTON,
    );
  }

  static async tapCustomTokenImportButton() {
    await TestHelpers.delay(1500);
    if (device.getPlatform() === 'android') {
      await TestHelpers.waitAndTapByLabel(TOKEN_IMPORT_BUTTON_ID);
    } else {
      await TestHelpers.tap(TOKEN_IMPORT_BUTTON_ID);
    }
  }

  static async tapBackButton() {
    await TestHelpers.tap(CUSTOM_TOKEN_BACK_BUTTON_ID);
  }

  static async tapNextButton() {
    await TestHelpers.tap(NEXT_BUTTON_CUSTOM_IMPORT);
  }

  static async tapTokenSymbolInputBox() {
    await TestHelpers.waitAndTap(TOKEN_ADDRESS_SYMBOL_ID);
  }

  static async tapTokenSymbolText() {
    await TestHelpers.tapByText(AddCustomTokenViewSelectorsText.TOKEN_SYMBOL);
  }

  static async scrollDownOnImportCustomTokens() {
    await TestHelpers.swipe(TOKEN_ADDRESS_SYMBOL_ID, 'up', 'slow', 0.6);
  }

  static async typeTokenAddress(address) {
    if (device.getPlatform() === 'android') {
      await TestHelpers.replaceTextInField(TOKEN_ADDRESS_INPUT_BOX_ID, address);
      await element(by.id(TOKEN_ADDRESS_INPUT_BOX_ID)).tapReturnKey();
    } else {
      await TestHelpers.typeText(TOKEN_ADDRESS_INPUT_BOX_ID, address + '\n');
    }
  }

  static async typeInNFTAddress(address) {
    if (device.getPlatform() === 'android') {
      await TestHelpers.replaceTextInField(NFT_ADDRESS_INPUT_BOX_ID, address);
      await element(by.id(NFT_ADDRESS_INPUT_BOX_ID)).tapReturnKey();
    } else {
      await TestHelpers.typeTextAndHideKeyboard(
        NFT_ADDRESS_INPUT_BOX_ID,
        address,
      );
    }
  }

  static async typeInNFTIdentifier(identifier) {
    if (device.getPlatform() === 'android') {
      await TestHelpers.replaceTextInField(
        NFT_IDENTIFIER_INPUT_BOX_ID,
        identifier,
      );
      await element(by.id(NFT_IDENTIFIER_INPUT_BOX_ID)).tapReturnKey();
    } else {
      await TestHelpers.typeTextAndHideKeyboard(
        NFT_IDENTIFIER_INPUT_BOX_ID,
        identifier,
      );
    }
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(CUSTOM_TOKEN_CONTAINER_ID);
  }

  static async isNFTAddressWarningVisible() {
    await TestHelpers.checkIfVisible(NFT_ADDRESS_WARNING_MESSAGE_ID);
  }

  static async switchToCustomTab() {
    await TestHelpers.tapByText(
      AddCustomTokenViewSelectorsText.CUSTOM_TOKEN_TAB,
    );
  }
}
