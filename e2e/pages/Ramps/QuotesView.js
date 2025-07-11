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

  get exploreMoreOptions() {
    return Matchers.getElementByText(QuoteSelectors.EXPLORE_MORE_OPTIONS);
  }

  get expandedQuotesSection() {
    return Matchers.getElementByID(QuoteSelectors.EXPANDED_QUOTES_SECTION);
  }

  get continueWithProvider() {
    const providerLocator = QuoteSelectors.CONTINUE_WITH_PROVIDER.replace('{{provider}}', '.*');
    return Matchers.getElementByText(new RegExp(`^${providerLocator}$`));
  }

  async tapContinueWithProvider() {
    await Gestures.tap(this.continueWithProvider);
  }

  async tapExploreMoreOptions() {
    await Gestures.tap(this.exploreMoreOptions);
  }

  async closeQuotesSection() {
    await Gestures.swipe(this.selectAQuoteLabel, 'down', 'fast', 1, 0, 0);
  }
}

export default new QuotesView();
