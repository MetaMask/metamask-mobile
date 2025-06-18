import {
  SwapsViewSelectorsIDs,
  SwapViewSelectorsTexts,
} from '../../selectors/swaps/SwapsView.selectors.js';

import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { waitFor } from 'detox';

class SwapView {
  get quoteSummary() {
    return Matchers.getElementByID(SwapsViewSelectorsIDs.QUOTE_SUMMARY);
  }

  get gasFee() {
    return Matchers.getElementByID(SwapsViewSelectorsIDs.GAS_FEE);
  }

  get fetchingQuotes(): DetoxElement {
    return Matchers.getElementByText(SwapViewSelectorsTexts.FETCHING_QUOTES);
  }

  get swapButton(): DetoxElement {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(SwapsViewSelectorsIDs.SWAP_BUTTON)
      : Matchers.getElementByLabel(SwapsViewSelectorsIDs.SWAP_BUTTON);
  }

  get iUnderstandLabel(): DetoxElement {
    return Matchers.getElementByText(SwapViewSelectorsTexts.I_UNDERSTAND);
  }

  get viewDetailsButton() {
    return Matchers.getElementByID(SwapsViewSelectorsIDs.VIEW_ALL_QUOTES);
  }

  async isPriceWarningDisplayed() {
    try {
      const label = await this.iUnderstandLabel as Detox.NativeElement;
      await waitFor(label).toBeVisible().withTimeout(5000);
      return true;
    } catch (e) {
      return false;
    }
  }

  generateSwapCompleteLabel(sourceToken: string, destinationToken: string): string {
    let title = SwapViewSelectorsTexts.SWAP_CONFIRMED;
    title = title.replace('{{sourceToken}}', sourceToken);
    title = title.replace('{{destinationToken}}', destinationToken);
    return title;
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
