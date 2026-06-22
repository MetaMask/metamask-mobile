import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { QuoteSelectors } from '../../../app/components/UI/Ramp/Aggregator/Views/Quotes/Quotes.testIds';
import { EncapsulatedElementType } from '../../framework';

class QuotesView {
  get selectAQuoteLabel(): EncapsulatedElementType {
    return Matchers.getElementByText(QuoteSelectors.RECOMMENDED_QUOTE);
  }

  get quoteAmountLabel(): EncapsulatedElementType {
    return Matchers.getElementByID(QuoteSelectors.QUOTE_AMOUNT_LABEL);
  }

  get quotes(): EncapsulatedElementType {
    return Matchers.getElementByID(QuoteSelectors.QUOTES);
  }

  get exploreMoreOptions(): EncapsulatedElementType {
    return Matchers.getElementByText(QuoteSelectors.EXPLORE_MORE_OPTIONS);
  }

  get expandedQuotesSection(): EncapsulatedElementType {
    return Matchers.getElementByID(QuoteSelectors.EXPANDED_QUOTES_SECTION);
  }

  get continueWithProvider(): EncapsulatedElementType {
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
