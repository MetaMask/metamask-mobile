import {
  SwapsViewSelectorsIDs,
  SwapViewSelectorsTexts,
} from '../../../app/components/UI/Swaps/SwapsView.testIds';

import Matchers from '../../../tests/framework/Matchers';
import Gestures from '../../../tests/framework/Gestures';
import { waitFor } from 'detox';
import { logger } from '../../../tests/framework/logger';

class SwapView {
  get quoteSummary(): DetoxElement {
    return Matchers.getElementByID(SwapsViewSelectorsIDs.QUOTE_SUMMARY);
  }

  get gasFee(): DetoxElement {
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

  get viewDetailsButton(): DetoxElement {
    return Matchers.getElementByID(SwapsViewSelectorsIDs.VIEW_ALL_QUOTES);
  }

  async isPriceWarningDisplayed(): Promise<boolean> {
    try {
      const label = (await this.iUnderstandLabel) as Detox.NativeElement;
      await waitFor(label).toBeVisible().withTimeout(5000);
      return true;
    } catch (e) {
      return false;
    }
  }

  generateSwapCompleteLabel(
    sourceToken: string,
    destinationToken: string,
  ): string {
    let title = SwapViewSelectorsTexts.SWAP_CONFIRMED;
    title = title.replace('{{sourceToken}}', sourceToken);
    title = title.replace('{{destinationToken}}', destinationToken);
    return title;
  }

  async tapSwapButton(): Promise<void> {
    await Gestures.waitAndTap(this.swapButton, {
      elemDescription: 'Swap Button in Swap View',
    });
  }

  async tapIUnderstandPriceWarning(): Promise<void> {
    const isDisplayed = await this.isPriceWarningDisplayed();
    if (isDisplayed) {
      await Gestures.waitAndTap(this.iUnderstandLabel, {
        elemDescription: 'I Understand Label in Swap View',
      });
    } else {
      // eslint-disable-next-line no-console
      logger.warn(
        'SwapView: tapIUnderstandPriceWarning - I Understand label is not displayed, skipping tap.',
      );
    }
  }

  async tapViewDetailsAllQuotes(): Promise<void> {
    await Gestures.waitAndTap(this.viewDetailsButton, {
      elemDescription: 'View Details Button in Swap View',
    });
  }
}

export default new SwapView();
