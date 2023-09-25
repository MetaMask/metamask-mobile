import TestHelpers from '../../helpers';
import {
  SWAP_SOURCE_TOKEN,
  SWAP_DEST_TOKEN,
  SWAP_MAX_SLIPPAGE,
  SWAP_SEARCH_TOKEN,
} from '../../../wdio/screen-objects/testIDs/Screens/QuoteView.js';
import messages from '../../../locales/languages/en.json';

export default class QuoteView {
  static async isVisible() {
    await TestHelpers.checkIfElementByTextIsVisible(messages.swaps.get_quotes);
  }

  static async findKeypadButton(digit) {
    return await TestHelpers.waitAndTapText(digit);
  }
  static async enterSwapAmount(amount) {
    for (let idx = 0; idx < amount.length; idx++) {
      await TestHelpers.waitAndTapText(amount[idx]);
    }
  }

  static async tapOnSelectSourceToken() {
    await TestHelpers.waitAndTap(SWAP_SOURCE_TOKEN);
  }

  static async tapOnSelectDestToken() {
    await TestHelpers.waitAndTap(SWAP_DEST_TOKEN);
  }

  static async selectToken(symbol) {
    await TestHelpers.waitAndTap(SWAP_SEARCH_TOKEN);
    await TestHelpers.typeText(SWAP_SEARCH_TOKEN, symbol);
    await TestHelpers.delay(1000);
    await TestHelpers.tapByText(symbol, 1);
  }

  static async tapOnGetQuotes() {
    await device.disableSynchronization();
    await TestHelpers.waitAndTapText(messages.swaps.get_quotes);
  }

  static async checkMaxSlippage(text) {
    await TestHelpers.checkIfElementHasString(SWAP_MAX_SLIPPAGE, text);
  }
}
