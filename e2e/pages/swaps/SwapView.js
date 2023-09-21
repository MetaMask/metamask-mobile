import TestHelpers from '../../helpers';
import {
  SWIPE_TO_SWAP_BUTTON,
  SWAP_QUOTE_SUMMARY,
  SWAP_GAS_FEE,
} from '../../../wdio/screen-objects/testIDs/Screens/SwapView.js';
import messages from '../../../locales/languages/en.json';

export default class SwapView {
  static async isVisible() {
    await TestHelpers.checkIfElementByTextIsVisible(
      messages.swaps.fetching_quotes,
    );
    await TestHelpers.checkIfVisible(SWAP_QUOTE_SUMMARY);
    await TestHelpers.checkIfVisible(SWAP_GAS_FEE);
  }

  static async swipeToSwap() {
    const percentage = device.getPlatform() === 'ios' ? 0.72 : 0.85;
    await TestHelpers.swipe(SWIPE_TO_SWAP_BUTTON, 'right', 'fast', percentage);
    await TestHelpers.delay(500);
    await TestHelpers.swipe(SWIPE_TO_SWAP_BUTTON, 'right', 'fast', percentage);
  }

  static async waitForSwapToComplete(sourceTokenSymbol, destTokenSymbol) {
    await TestHelpers.checkIfElementByTextIsVisible(
      `Swap complete (${sourceTokenSymbol} to ${destTokenSymbol})`,
    );
    await device.enableSynchronization();
    await TestHelpers.delay(5000);
  }
}
