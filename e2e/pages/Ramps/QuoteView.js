import Matchers from '../../utils/Matchers';
import { QuoteSelectors } from '../../selectors/Ramps/Quote.selectors';

class QuoteView {
  get selectAQuoteLabel() {
    return Matchers.getElementByText(QuoteSelectors.SELECT_A_QUOTE);
  }

  get quoteAmountLabel() {
    return Matchers.getElementByID(QuoteSelectors.QUOTE_AMOUNT_LABEL);
  }

  get quotes() {
    return Matchers.getElementByID(QuoteSelectors.QUOTES);
  }
}

export default new QuoteView();
