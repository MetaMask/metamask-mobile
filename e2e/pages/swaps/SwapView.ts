import {
  SwapsViewSelectors,
  SwapViewSelectorsTexts,
} from '../../selectors/swaps/SwapsView.selectors.js';

import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { waitFor } from 'detox';

class SwapView {
  get quoteSummary(): DetoxElement {
    return Matchers.getElementByID(SwapsViewSelectors.QUOTE_SUMMARY);
  }

  get gasFee(): DetoxElement {
    return Matchers.getElementByID(SwapsViewSelectors.GAS_FEE);
  }

  get fetchingQuotes(): DetoxElement {
    return Matchers.getElementByText(SwapViewSelectorsTexts.FETCHING_QUOTES);
  }

  get swapButton(): DetoxElement {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(SwapsViewSelectors.SWAP_BUTTON)
      : Matchers.getElementByLabel(SwapsViewSelectors.SWAP_BUTTON);
  }

  get iUnderstandLabel(): DetoxElement {
    return Matchers.getElementByText(SwapViewSelectorsTexts.I_UNDERSTAND);
  }

  async isPriceWarningDisplayed(): Promise<boolean> {
    try {
      const label = await this.iUnderstandLabel;
      await waitFor(label as Detox.NativeElement).toBeVisible().withTimeout(5000);
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
}

export default new SwapView();
