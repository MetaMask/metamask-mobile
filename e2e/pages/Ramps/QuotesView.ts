import Matchers from '../../../tests/framework/Matchers';
import Gestures from '../../../tests/framework/Gestures';
import { QuoteSelectors } from '../../../app/components/UI/Ramp/Aggregator/Views/Quotes/Quotes.testIds';

class QuotesView {
  get selectAQuoteLabel(): DetoxElement {
    return Matchers.getElementByText(QuoteSelectors.RECOMMENDED_QUOTE);
  }

  get quoteAmountLabel(): DetoxElement {
    return Matchers.getElementByID(QuoteSelectors.QUOTE_AMOUNT_LABEL);
  }

  get quotes(): DetoxElement {
    return Matchers.getElementByID(QuoteSelectors.QUOTES);
  }

  get exploreMoreOptions(): DetoxElement {
    return Matchers.getElementByText(QuoteSelectors.EXPLORE_MORE_OPTIONS);
  }

  get expandedQuotesSection(): DetoxElement {
    return Matchers.getElementByID(QuoteSelectors.EXPANDED_QUOTES_SECTION);
  }

  get continueWithProvider(): DetoxElement {
    const providerLocator = QuoteSelectors.CONTINUE_WITH_PROVIDER.replace(
      '{{provider}}',
      '.*',
    );
    return Matchers.getElementByText(new RegExp(`^${providerLocator}$`));
  }

  async tapContinueWithProvider() {
    await Gestures.tap(this.continueWithProvider);
  }

  async tapExploreMoreOptions() {
    await Gestures.tap(this.exploreMoreOptions);
  }

  async closeQuotesSection() {
    await Gestures.swipe(this.selectAQuoteLabel, 'down', {
      elemDescription: 'Close Quotes Section',
      speed: 'fast',
      percentage: 0.7,
    });
  }
}

export default new QuotesView();
