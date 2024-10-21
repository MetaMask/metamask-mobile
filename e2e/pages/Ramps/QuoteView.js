import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { QuoteSelectors } from '../../selectors/Ramps/Quote.selectors';

class QuoteView {
  get selectAQuoteLabel() {
    return Matchers.getElementByText(QuoteSelectors.SELECT_A_QUOTE_TEXT);
  }

  async dismiss() {
    await Gestures.swipe(this.selectAQuoteLabel, 'down', 'fast', 0.5);
  }
}

export default new QuoteView();
