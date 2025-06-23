import { QuotesModalSelectorIDs, QuotesModalSelectorsTexts } from '../../selectors/swaps/QuotesModal.selectors.js';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class QuotesModal {
  get closeButton() {
    return Matchers.getElementByID(QuotesModalSelectorIDs.QUOTES_MODAL_CLOSE);
  }

  get header() {
    return Matchers.getElementByText(QuotesModalSelectorsTexts.QUOTES_OVERVIEW);
  }

  async close() {
    await Gestures.waitAndTap(this.closeButton, {experimentalWaitForStability: true});
  }
}

export default new QuotesModal();
