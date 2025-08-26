import {
  QuotesModalSelectorIDs,
  QuotesModalSelectorsTexts,
} from '../../selectors/swaps/QuotesModal.selectors.js';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';

class QuotesModal {
  get closeButton(): DetoxElement {
    return Matchers.getElementByID(QuotesModalSelectorIDs.QUOTES_MODAL_CLOSE);
  }

  get header(): DetoxElement {
    return Matchers.getElementByText(QuotesModalSelectorsTexts.QUOTES_OVERVIEW);
  }

  async close(): Promise<void> {
    await Gestures.waitAndTap(this.closeButton, {
      elemDescription: 'Close Button in Quotes Modal',
    });
  }
}

export default new QuotesModal();
