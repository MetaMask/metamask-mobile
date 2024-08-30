import {
  SwapsViewSelectors,
  SwapViewSelectorsTexts,
} from '../../selectors/swaps/SwapsView.selectors.js';

import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import Assertions from '../../utils/Assertions';

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
    // Wait for counter to go down to 0:05
    // as the flashing gas fees happening when counter is 0:15
    // will disables the swipe button
    await Assertions.checkIfTextIsDisplayed('New quotes in 0:05');
    await Gestures.swipe(this.swipeToSwapButton, 'right', 'fast', percentage);
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
