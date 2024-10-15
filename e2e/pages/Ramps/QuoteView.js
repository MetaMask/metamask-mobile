import Matchers from '../../utils/Matchers';
import TestHelpers from '../../helpers';
import { QuoteSelectors } from '../../selectors/Ramps/Quote.selectors';

class QuoteView {
  get selectAQuoteLabel() {
    return Matchers.getElementByText(QuoteSelectors.SELECT_A_QUOTE);
  }

  async dismiss() {
    await TestHelpers.swipeByText('Select a Quote', 'down', 'fast', 0.5);
  }
}

export default new QuoteView();
