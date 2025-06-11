import {
  SwapsViewSelectors,
  SwapViewSelectorsTexts,
} from '../../selectors/swaps/SwapsView.selectors.js';

import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import TestHelpers from '../../helpers';
import { waitFor } from 'detox';

class SwapView {
  get quoteSummary(): Promise<Detox.NativeElement> {
    return Matchers.getElementByID(SwapsViewSelectors.QUOTE_SUMMARY);
  }

  get gasFee(): Promise<Detox.NativeElement> {
    return Matchers.getElementByID(SwapsViewSelectors.GAS_FEE);
  }

  get fetchingQuotes(): Promise<Detox.NativeElement> {
    return Matchers.getElementByText(SwapViewSelectorsTexts.FETCHING_QUOTES);
  }

  get swapButton(): Promise<Detox.NativeElement> {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(SwapsViewSelectors.SWAP_BUTTON)
      : Matchers.getElementByLabel(SwapsViewSelectors.SWAP_BUTTON);
  }

  get iUnderstandLabel(): Promise<Detox.NativeElement> {
    return Matchers.getElementByText(SwapViewSelectorsTexts.I_UNDERSTAND);
  }

  async isPriceWarningDisplayed(): Promise<boolean> {
    try {
      const element = await this.iUnderstandLabel;
      await waitFor(element).toBeVisible().withTimeout(5000);
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

  // Function to check if the button is enabled
  async isButtonEnabled(element: Detox.NativeElement): Promise<boolean> {
    const attributes = await element.getAttributes();
    return attributes.enabled === true; // Check if enabled is true
  }

  async tapSwapButton(): Promise<void> {
    await Gestures.waitAndTap(this.swapButton);
  }

  async tapIUnderstandPriceWarning(): Promise<void> {
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
