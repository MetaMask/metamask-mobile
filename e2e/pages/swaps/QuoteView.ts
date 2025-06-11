import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import {
  QuoteViewSelectorIDs,
  QuoteViewSelectorText,
} from '../../selectors/swaps/QuoteView.selectors';

class QuoteView {
  get getQuotes(): Promise<Detox.NativeElement> {
    return Matchers.getElementByText(QuoteViewSelectorText.GET_QUOTES);
  }

  get getNewQuotes() {
    return Matchers.getElementByText(QuoteViewSelectorText.GET_NEW_QUOTES);
  }

  get cancelButton() {
    return Matchers.getElementByText(QuoteViewSelectorText.CANCEL);
  }

  get sourceToken(): Promise<Detox.NativeElement> {
    return Matchers.getElementByID(QuoteViewSelectorIDs.SOURCE_TOKEN);
  }

  get destToken(): Promise<Detox.NativeElement> {
    return Matchers.getElementByID(QuoteViewSelectorIDs.DEST_TOKEN);
  }

  get searchToken(): Promise<Detox.NativeElement> {
    return Matchers.getElementByID(QuoteViewSelectorIDs.SEARCH_TOKEN);
  }

  get maxSlippage(): Promise<Detox.NativeElement> {
    return Matchers.getElementByID(QuoteViewSelectorIDs.MAX_SLIPPAGE);
  }

  async enterSwapAmount(amount: string): Promise<void> {
    for (let idx = 0; idx < amount.length; idx++) {
      const element = Matchers.getElementByText(amount[idx]);
      await Gestures.waitAndTap(element);
    }
  }

  async tapOnSelectSourceToken(): Promise<void> {
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

  async typeSearchToken(symbol: string): Promise<void> {
    await Gestures.typeTextAndHideKeyboard(this.searchToken, symbol);
  }

  async selectToken(symbol: string, index: number = 1): Promise<void> {
    const element = Matchers.getElementByText(symbol, index);
    await Gestures.waitAndTap(element);
  }

  async tapOnGetQuotes() {
    await Gestures.waitAndTap(this.getQuotes, {
      experimentalWaitForStability: true,
    });
  }

  async tapOnCancelButton(): Promise<void> {
    await Gestures.waitAndTap(this.cancelButton);
  }
}

export default new QuoteView();
