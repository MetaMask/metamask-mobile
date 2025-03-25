import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { QuoteSelectors } from '../../selectors/Ramps/Quotes.selectors';

class QuotesView {
  get selectAQuoteLabel() {
    return Matchers.getElementByText(QuoteSelectors.RECOMMENDED_QUOTE);
  }

  get quoteAmountLabel() {
    return Matchers.getElementByID(QuoteSelectors.QUOTE_AMOUNT_LABEL);
  }

  get quotes() {
    return Matchers.getElementByID(QuoteSelectors.QUOTES);
  }

  async closeQuotesSection() {
    await Gestures.swipe(this.selectAQuoteLabel, 'down', 'fast', 1, 0, 0);
  }
}

export default new QuotesView();
