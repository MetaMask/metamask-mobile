import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import {
  QuoteViewSelectorIDs,
  QuoteViewSelectorText,
} from '../../selectors/swaps/QuoteView.selectors';

class QuoteView {
  get getQuotes() {
    return Matchers.getElementByText(QuoteViewSelectorText.GET_QUOTES);
  }

  get getNewQuotes() {
    return Matchers.getElementByText(QuoteViewSelectorText.GET_NEW_QUOTES);
  }

  get cancelButton() {
    return Matchers.getElementByText(QuoteViewSelectorText.CANCEL);
  }

  get sourceToken() {
    return Matchers.getElementByID(QuoteViewSelectorIDs.SOURCE_TOKEN);
  }

  get destToken() {
    return Matchers.getElementByID(QuoteViewSelectorIDs.DEST_TOKEN);
  }

  get searchToken() {
    return Matchers.getElementByID(QuoteViewSelectorIDs.SEARCH_TOKEN);
  }

  get maxSlippage() {
    return Matchers.getElementByID(QuoteViewSelectorIDs.MAX_SLIPPAGE);
  }

  async enterSwapAmount(amount) {
    for (let idx = 0; idx < amount.length; idx++) {
      const element = Matchers.getElementByText(amount[idx]);
      await Gestures.waitAndTap(element);
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

  async typeSearchToken(symbol) {
    await Gestures.typeTextAndHideKeyboard(this.searchToken, symbol);
  }

  async selectToken(symbol, index = 1) {
    const element = Matchers.getElementByText(symbol, index);
    await Gestures.waitAndTap(element, { experimentalWaitForStability: true });
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
