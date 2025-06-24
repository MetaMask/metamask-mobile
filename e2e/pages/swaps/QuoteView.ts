import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import {
  QuoteViewSelectorIDs,
  QuoteViewSelectorText,
} from '../../selectors/swaps/QuoteView.selectors';

class QuoteView {
  get getQuotes(): DetoxElement {
    return Matchers.getElementByText(QuoteViewSelectorText.GET_QUOTES);
  }

  get getNewQuotes() {
    return Matchers.getElementByText(QuoteViewSelectorText.GET_NEW_QUOTES);
  }

  get cancelButton() {
    return Matchers.getElementByText(QuoteViewSelectorText.CANCEL);
  }

  get sourceToken(): DetoxElement {
    return Matchers.getElementByID(QuoteViewSelectorIDs.SOURCE_TOKEN);
  }

  get destToken(): DetoxElement {
    return Matchers.getElementByID(QuoteViewSelectorIDs.DEST_TOKEN);
  }

  get searchToken(): TypableElement {
    return Matchers.getElementByID(QuoteViewSelectorIDs.SEARCH_TOKEN) as TypableElement;
  }

  get maxSlippage(): DetoxElement {
    return Matchers.getElementByID(QuoteViewSelectorIDs.MAX_SLIPPAGE);
  }

 async enterSwapAmount(amount: string) {
  for (const digit of amount) {
    const button = Matchers.getElementByText(digit);
    await Gestures.waitAndTap(button);
  }
}

  async tapOnSelectSourceToken() {
    await Gestures.waitAndTap(this.sourceToken);
  }

  async tapOnSelectDestToken() {
    await Gestures.waitAndTap(this.destToken, {
      experimentalWaitForStability: true,
    });
  }

  async tapSearchToken() {
    await Gestures.waitAndTap(this.searchToken, {
      experimentalWaitForStability: true,
    });
  }

  async typeSearchToken(symbol: string) {
    await Gestures.typeTextAndHideKeyboard(this.searchToken, symbol);
  }

  async selectToken(symbol: string, index: number = 1): Promise<void> {
    const token = Matchers.getElementByText(symbol, index);
    await Gestures.waitAndTap(token);
  }

  async tapOnGetQuotes() {
    await Gestures.waitAndTap(this.getQuotes, {
      experimentalWaitForStability: true,
    });
  }

  async tapOnCancelButton() {
    await Gestures.waitAndTap(this.cancelButton);
  }
}

export default new QuoteView();
