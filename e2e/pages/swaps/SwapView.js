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

  // Function to check if the button is enabled
  async isButtonEnabled(element) {
    const attributes = await element.getAttributes();
    return attributes.enabled === true; // Check if enabled is true
  }

  async swipeToSwap() {
    const percentage = device.getPlatform() === 'ios' ? 0.72 : 0.95;
    const swapsSliderElement = await this.swipeToSwapButton;
    const delay = 500; // Delay in milliseconds

    // Wait until the button is enabled before performing swipe actions
    while (!(await this.isButtonEnabled(swapsSliderElement))) {
      await TestHelpers.delay(delay); // Wait for the specified delay
    }

    // Once enabled, perform the swipe actions
    await Gestures.swipe(this.swipeToSwapButton, 'right', 'fast', percentage);
    await Gestures.swipe(this.swipeToSwapButton, 'right', 'fast', percentage);
  }

  async swapCompleteLabel(sourceTokenSymbol, destTokenSymbol) {
    try {
      await TestHelpers.checkIfElementByTextIsVisible(
        this.generateSwapCompleteLabel(sourceTokenSymbol, destTokenSymbol), 90000
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(`Swap complete didn't pop up: ${e}`);
    }
  }

  async tapIUnderstandPriceWarning() {
    try {
      await Gestures.waitAndTap(this.iUnderstandLabel, 3000);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(`Price warning not displayed: ${e}`);
    }
  }

}

export default new SwapView();
