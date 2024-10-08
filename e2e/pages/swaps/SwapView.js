import {
  SwapsViewSelectors,
  SwapViewSelectorsTexts,
} from '../../selectors/swaps/SwapsView.selectors.js';

import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import TestHelpers from '../..//helpers';

class SwapView {
  get quoteSummary() {
    return Matchers.getElementByID(SwapsViewSelectors.QUOTE_SUMMARY);
  }

  get gasFee() {
    return Matchers.getElementByID(SwapsViewSelectors.GAS_FEE);
  }

  get fetchingQuotes() {
    return Matchers.getElementByText(SwapViewSelectorsTexts.FETCHING_QUOTES);
  }

  get swipeToSwapButton() {
    return Matchers.getElementByID(SwapsViewSelectors.SWIPE_TO_SWAP_BUTTON);
  }

  get iUnderstandLabel() {
    return Matchers.getElementByText(SwapViewSelectorsTexts.I_UNDERSTAND);
  }

  generateSwapCompleteLabel(sourceToken, destinationToken) {
    let title = SwapViewSelectorsTexts.SWAP_CONFIRMED;
    title = title.replace('{{sourceToken}}', sourceToken);
    title = title.replace('{{destinationToken}}', destinationToken);
    return title;
  }

  async swipeToSwap() {
    const percentage = device.getPlatform() === 'ios' ? 0.72 : 0.95;

    // Swipe could happen at the same time when gas fees are falshing
    // and that's when the swipe button becomes disabled
    // that's the need to retry
    await Gestures.swipe(this.swipeToSwapButton, 'right', 'fast', percentage);
    await Gestures.swipe(this.swipeToSwapButton, 'right', 'fast', percentage);
  }

  async swapCompleteLabel(sourceTokenSymbol, destTokenSymbol) {
    await TestHelpers.checkIfElementByTextIsVisible(
      this.generateSwapCompleteLabel(sourceTokenSymbol, destTokenSymbol), 60000
    );
  }

  async tapIUnderstandPriceWarning() {
    try {
      await Gestures.waitAndTap(this.iUnderstandLabel, 1000);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(`Price warning not displayed: ${e}`);
    }
  }

}

export default new SwapView();
