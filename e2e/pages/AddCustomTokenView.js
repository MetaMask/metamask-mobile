import TestHelpers from '../helpers';
import {
  CUSTOM_TOKEN_BACK_BUTTON_ID,
  CUSTOM_TOKEN_CONTAINER_ID,
  TOKEN_ADDRESS_INPUT_BOX_ID,
  TOKEN_ADDRESS_SYMBOL_ID,
  TOKEN_ADDRESS_WARNING_MESSAGE_ID,
  TOKEN_IMPORT_BUTTON_ID,
  TOKEN_PRECISION_WARNING_MESSAGE_ID,
} from '../../wdio/screen-objects/testIDs/Screens/AddCustomToken.testIds';
import {
  NFT_ADDRESS_INPUT_BOX_ID,
  NFT_ADDRESS_WARNING_MESSAGE_ID,
  NFT_IDENTIFIER_INPUT_BOX_ID,
  NFT_IDENTIFIER_WARNING_MESSAGE_ID,
} from '../../wdio/screen-objects/testIDs/Screens/NFTImportScreen.testIds';

import messages from '../../locales/languages/en.json';

const TOKEN_SYMBOL_TEXT = messages.token.token_symbol;
export default class AddCustomTokenView {
  static async tapImportButton() {
    //await TestHelpers.swipe(TOKEN_ADDRESS_SYMBOL_ID, 'up', 'slow', 0.6);
    await TestHelpers.waitAndTapText('IMPORT');
  }

  static async tapCustomTokenTab() {
    await TestHelpers.delay(1500);
    await TestHelpers.waitAndTapText('CUSTOM TOKEN');
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

  static async tapTokenSymbolInputBox() {
    await TestHelpers.waitAndTap(TOKEN_ADDRESS_SYMBOL_ID);
  }

  static async tapTokenSymbolText() {
    await TestHelpers.tapByText(TOKEN_SYMBOL_TEXT);
  }

  static async scrollDownOnImportCustomTokens() {
    await TestHelpers.swipe(TOKEN_ADDRESS_SYMBOL_ID, 'up', 'slow', 0.6);
  }

  static async typeTokenAddress(address) {
    if (device.getPlatform() === 'android') {
      await TestHelpers.replaceTextInField(TOKEN_ADDRESS_INPUT_BOX_ID, address);
      await element(by.id(TOKEN_ADDRESS_INPUT_BOX_ID)).tapReturnKey();
    } else {
      await TestHelpers.typeText(TOKEN_ADDRESS_INPUT_BOX_ID, address);
    }
  }

  static async typeTokenSymbol(symbol) {
    await TestHelpers.typeTextAndHideKeyboard(TOKEN_ADDRESS_SYMBOL_ID, symbol);
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

  static async isNFTIdentifierWarningVisible() {
    await TestHelpers.checkIfVisible(NFT_IDENTIFIER_WARNING_MESSAGE_ID);
  }

  static async isTokenAddressWarningVisible() {
    await TestHelpers.checkIfVisible(TOKEN_ADDRESS_WARNING_MESSAGE_ID);
  }

  static async isTokenPrecisionWarningVisible() {
    await TestHelpers.checkIfVisible(TOKEN_PRECISION_WARNING_MESSAGE_ID);
  }
}
