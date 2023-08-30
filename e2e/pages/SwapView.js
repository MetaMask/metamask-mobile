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
import messages from '../../locales/languages/en.json';

export default class SwapView {
  static swapOnboarded = false;

  static async tapStartSwapping() {
    await TestHelpers.waitAndTapText(messages.swaps.onboarding.start_swapping);
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
    await TestHelpers.waitAndTapText(messages.swaps.get_quotes);
  }

  static async swipeToSwap() {
    const percentage =  device.getPlatform() === 'ios' ? 0.72 : 0.85
    await TestHelpers.swipe(SWIPE_TO_SWAP_BUTTON, 'right', 'fast', percentage);
    await TestHelpers.delay(500);
    await TestHelpers.swipe(SWIPE_TO_SWAP_BUTTON, 'right', 'slow', percentage);
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
    await TestHelpers.checkIfElementByTextIsVisible(messages.swaps.fetching_quotes);
    await TestHelpers.checkIfVisible(SWAP_QUOTE_SUMMARY);
    await TestHelpers.checkIfVisible(SWAP_GAS_FEE);
  }

  static async swapToken(sourceTokenSymbol, destTokenSymbol) {
    const swapCompleteMessage = `Swap complete (${sourceTokenSymbol} to ${destTokenSymbol})`
    await this.swipeToSwap();
    await TestHelpers.checkIfElementByTextIsVisible(messages.swaps.completed_swap);
    await TestHelpers.checkIfElementByTextIsVisible(swapCompleteMessage);
    await TestHelpers.delay(3500)
    await device.enableSynchronization();
  }
}
