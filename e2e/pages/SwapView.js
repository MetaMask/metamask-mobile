import TestHelpers from '../helpers';
import {
  SWAP_SOURCE_TOKEN,
  SWAP_DEST_TOKEN,
  SWAP_MAX_SLIPPAGE,
  SWIPE_TO_SWAP_BUTTON,
  SWAP_QUOTE_SUMMARY,
  SWAP_GAS_FEE,
  SWAP_SEARCH_TOKEN,
} from '../../wdio/screen-objects/testIDs/Screens/SwapView.js';

export default class SwapView {
  static swapOnboarded = false;

  static async tapStartSwapping() {
    await TestHelpers.waitAndTapText('Start swapping');
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
    await TestHelpers.checkIfElementByTextIsVisible('Get quotes');
    await TestHelpers.waitAndTapText('Get quotes');
  }

  static async swipeToSwap() {
    if (device.getPlatform() === 'ios') {
      await TestHelpers.swipe(SWIPE_TO_SWAP_BUTTON, 'right', 'slow', 0.72);
      await TestHelpers.delay(500);
      await TestHelpers.swipe(SWIPE_TO_SWAP_BUTTON, 'right', 'slow', 0.72);
    } else await TestHelpers.swipe(SWIPE_TO_SWAP_BUTTON, 'right', 'slow', 0.8);
  }

  static async getQuote(quantity, sourceTokenSymbol, destTokenSymbol) {
    if (!this.swapOnboarded) {
      await this.tapStartSwapping();
      this.swapOnboarded = true;
    }
    if (sourceTokenSymbol && sourceTokenSymbol !== 'ETH') {
      await this.tapOnSelectSourceToken();
      await this.selectToken(sourceTokenSymbol);
    }
    await this.enterSwapAmount(quantity);
    await this.tapOnSelectDestToken();
    await this.selectToken(destTokenSymbol);
    if (sourceTokenSymbol === 'WETH' || destTokenSymbol === 'WETH') {
      await TestHelpers.checkIfElementHasString(
        SWAP_MAX_SLIPPAGE,
        'Max slippage 0%',
      );
    }
    await device.disableSynchronization();
    await this.tapOnGetQuotes();
    await TestHelpers.checkIfElementByTextIsVisible('Fetching quotes');
    await TestHelpers.checkIfVisible(SWAP_QUOTE_SUMMARY);
    await TestHelpers.checkIfVisible(SWAP_GAS_FEE);
  }

  static async swapToken(sourceTokenSymbol, destTokenSymbol) {
    await this.swipeToSwap();
    await TestHelpers.checkIfElementByTextIsVisible(`Swap!`);
    await TestHelpers.checkIfElementByTextIsVisible(
      `Swap complete (${sourceTokenSymbol} to ${destTokenSymbol})`,
    );
    await device.enableSynchronization();
  }
}
