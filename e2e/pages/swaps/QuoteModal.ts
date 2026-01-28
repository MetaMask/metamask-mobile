import {
  QuotesModalSelectorIDs,
  QuotesModalSelectorsTexts,
} from '../../../app/components/UI/Swaps/QuotesModal.testIds';
import Matchers from '../../../tests/framework/Matchers';
import Gestures from '../../../tests/framework/Gestures';

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
