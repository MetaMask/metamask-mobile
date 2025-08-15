import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import {
  QuoteViewSelectorIDs,
  QuoteViewSelectorText,
} from '../../selectors/swaps/QuoteView.selectors';

class QuoteView {
  get getQuotes(): DetoxElement {
    return Matchers.getElementByText(QuoteViewSelectorText.GET_QUOTES);
  }

  get getNewQuotes(): DetoxElement {
    return Matchers.getElementByText(QuoteViewSelectorText.GET_NEW_QUOTES);
  }

  get cancelButton(): DetoxElement {
    return Matchers.getElementByText(QuoteViewSelectorText.CANCEL);
  }

  get sourceToken(): DetoxElement {
    return Matchers.getElementByID(QuoteViewSelectorIDs.SOURCE_TOKEN);
  }

  get destToken(): DetoxElement {
    return Matchers.getElementByID(QuoteViewSelectorIDs.DEST_TOKEN);
  }

  get searchToken(): TypableElement {
    return Matchers.getElementByID(
      QuoteViewSelectorIDs.SEARCH_TOKEN,
    ) as TypableElement;
  }

  get maxSlippage(): DetoxElement {
    return Matchers.getElementByID(QuoteViewSelectorIDs.MAX_SLIPPAGE);
  }

  async enterSwapAmount(amount: string) {
    for (const digit of amount) {
      const button = Matchers.getElementByText(digit);
      await Gestures.waitAndTap(button, {
        elemDescription: `Digit ${digit} in Swap Amount`,
      });
    }
  }

  async tapOnSelectSourceToken() {
    await Gestures.waitAndTap(this.sourceToken, {
      elemDescription: 'Source Token in Quote View',
    });
  }

  async tapOnSelectDestToken() {
    await Gestures.waitAndTap(this.destToken, {
      elemDescription: 'Destination Token in Quote View',
    });
  }

  async tapSearchToken() {
    await Gestures.waitAndTap(this.searchToken, {
      elemDescription: 'Search Token in Quote View',
    });
  }

  async typeSearchToken(symbol: string) {
    await Gestures.typeText(this.searchToken, symbol, {
      elemDescription: `Search Token with symbol ${symbol}`,
    });
  }

  async selectToken(symbol: string, index: number = 1): Promise<void> {
    const token = Matchers.getElementByText(symbol, index);
    await Gestures.waitAndTap(token, {
      elemDescription: `Token with symbol ${symbol} at index ${index}`,
    });
  }

  async tapOnGetQuotes(): Promise<void> {
    await Gestures.waitAndTap(this.getQuotes, {
      elemDescription: 'Get Quotes Button in Quote View',
    });
  }

  async tapOnCancelButton(): Promise<void> {
    await Gestures.waitAndTap(this.cancelButton, {
      elemDescription: 'Cancel Button in Quote View',
    });
  }
}

export default new QuoteView();
