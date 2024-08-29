import {
  SwapsViewSelectors,
  SwapViewSelectorsTexts,
} from '../../selectors/swaps/SwapsView.selectors.js';

import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import TestHelpers from '../../helpers';

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
    const percentage = device.getPlatform() === 'ios' ? 0.72 : 0.85;
    // Wait past the flashing quote to make sure swap button is enabled
    await TestHelpers.checkIfElementWithTextIsVisible('New quotes in 0:10');
    await Gestures.swipe(this.swipeToSwapButton, 'right', 'slow', percentage);
  }

  swapCompleteLabel(sourceTokenSymbol, destTokenSymbol) {
    return Matchers.getElementByText(
      this.generateSwapCompleteLabel(sourceTokenSymbol, destTokenSymbol),
    );
  }

  async tapIUnderstandPriceWarning() {
    try {
      await Gestures.waitAndTap(this.iUnderstandLabel);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(`Price warning not displayed: ${e}`);
    }
  }
}

export default new SwapView();
