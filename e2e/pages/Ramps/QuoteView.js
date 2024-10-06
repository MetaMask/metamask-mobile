import Matchers from '../../utils/Matchers';
import { QuoteSelectors } from '../../selectors/Ramps/Quote.selectors';

class QuoteView {
  get selectAQuoteLabel() {
    return Matchers.getElementByText(QuoteSelectors.SELECT_A_QUOTE);
  }
}

export default new QuoteView();
