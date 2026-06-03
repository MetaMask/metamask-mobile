import Matchers from '../../framework/Matchers';
import { QuoteSelectors } from '../../../app/components/UI/Ramp/Aggregator/Views/Quotes/Quotes.testIds';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class QuotesView {
  get selectAQuoteLabel(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText(QuoteSelectors.RECOMMENDED_QUOTE),
      appium: () =>
        PlaywrightMatchers.getElementByText(QuoteSelectors.RECOMMENDED_QUOTE),
    });
  }

  get quoteAmountLabel(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(QuoteSelectors.QUOTE_AMOUNT_LABEL),
      appium: () =>
        PlaywrightMatchers.getElementById(QuoteSelectors.QUOTE_AMOUNT_LABEL),
    });
  }

  get quotes(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(QuoteSelectors.QUOTES),
      appium: () => PlaywrightMatchers.getElementById(QuoteSelectors.QUOTES),
    });
  }

  get exploreMoreOptions(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(QuoteSelectors.EXPLORE_MORE_OPTIONS),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          QuoteSelectors.EXPLORE_MORE_OPTIONS,
        ),
    });
  }

  get expandedQuotesSection(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(QuoteSelectors.EXPANDED_QUOTES_SECTION),
      appium: () =>
        PlaywrightMatchers.getElementById(
          QuoteSelectors.EXPANDED_QUOTES_SECTION,
        ),
    });
  }

  get continueWithProvider(): DetoxElement {
    const providerLocator = QuoteSelectors.CONTINUE_WITH_PROVIDER.replace(
      '{{provider}}',
      '.*',
    );
    return Matchers.getElementByText(new RegExp(`^${providerLocator}$`));
  }

  async tapContinueWithProvider() {
    await UnifiedGestures.tap(this.continueWithProvider);
  }

  async tapExploreMoreOptions() {
    await UnifiedGestures.tap(this.exploreMoreOptions);
  }

  async closeQuotesSection() {
    await UnifiedGestures.swipe(this.selectAQuoteLabel, 'down', {
      elemDescription: 'Close Quotes Section',
      speed: 'fast',
      percentage: 0.7,
    });
  }
}

export default new QuotesView();
