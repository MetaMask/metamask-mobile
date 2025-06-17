import {
  SwapsViewSelectorsIDs,
  SwapViewSelectorsTexts,
} from '../../selectors/swaps/SwapsView.selectors.js';

import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import TestHelpers from '../..//helpers';
import { waitFor } from 'detox';

class SwapView {
  get quoteSummary() {
    return Matchers.getElementByID(SwapsViewSelectorsIDs.QUOTE_SUMMARY);
  }

  get gasFee() {
    return Matchers.getElementByID(SwapsViewSelectorsIDs.GAS_FEE);
  }

  get fetchingQuotes() {
    return Matchers.getElementByText(SwapViewSelectorsTexts.FETCHING_QUOTES);
  }

  get swapButton() {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(SwapsViewSelectorsIDs.SWAP_BUTTON)
      : Matchers.getElementByLabel(SwapsViewSelectorsIDs.SWAP_BUTTON);
  }

  get iUnderstandLabel() {
    return Matchers.getElementByText(SwapViewSelectorsTexts.I_UNDERSTAND);
  }

  get viewDetailsButton() {
    return Matchers.getElementByID(SwapsViewSelectorsIDs.VIEW_ALL_QUOTES);
  }

  async isPriceWarningDisplayed() {
    try {
      const element = await this.iUnderstandLabel;
      await waitFor(element).toBeVisible().withTimeout(5000);
      return true;
    } catch (e) {
      return false;
    }
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

  async tapSwapButton() {
    await Gestures.waitAndTap(this.swapButton);
  }

  async tapIUnderstandPriceWarning() {
    const isDisplayed = await this.isPriceWarningDisplayed();
    if (isDisplayed) {
      await Gestures.waitAndTap(this.iUnderstandLabel);
    } else {
      // eslint-disable-next-line no-console
      console.log('Price warning not displayed');
    }
  }

  async tapViewDetailsAllQuotes() {
    await Gestures.waitAndTap(this.viewDetailsButton);
  }
}

export default new SwapView();
