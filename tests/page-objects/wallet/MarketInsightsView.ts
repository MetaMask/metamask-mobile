import Matchers from '../../framework/Matchers';
import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import { MarketInsightsSelectorsIDs } from '../../../app/components/UI/MarketInsights/MarketInsights.testIds';

class MarketInsightsView {
  get container() {
    return Matchers.getElementByID(MarketInsightsSelectorsIDs.VIEW_CONTAINER);
  }

  get swapButton() {
    return Matchers.getElementByID(MarketInsightsSelectorsIDs.SWAP_BUTTON);
  }

  get buyButton() {
    return Matchers.getElementByID(MarketInsightsSelectorsIDs.BUY_BUTTON);
  }

  get scrollView(): Promise<Detox.NativeMatcher> {
    return Matchers.getIdentifier(MarketInsightsSelectorsIDs.VIEW_SCROLL);
  }

  get longButton() {
    return Matchers.getElementByID(MarketInsightsSelectorsIDs.LONG_BUTTON);
  }

  get shortButton() {
    return Matchers.getElementByID(MarketInsightsSelectorsIDs.SHORT_BUTTON);
  }

  get thumbsUpButton() {
    return Matchers.getElementByID(MarketInsightsSelectorsIDs.THUMBS_UP_BUTTON);
  }

  get thumbsDownButton() {
    return Matchers.getElementByID(
      MarketInsightsSelectorsIDs.THUMBS_DOWN_BUTTON,
    );
  }

  trendItem(index: number) {
    return Matchers.getElementByID(
      `${MarketInsightsSelectorsIDs.TREND_ITEM}-${index}`,
    );
  }

  async expectViewVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.container, {
      description: 'Market Insights detail view is visible',
    });
  }

  async expectLongButtonVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.longButton, {
      description: 'Market Insights Long button is visible',
    });
  }

  async expectLongButtonNotVisible(): Promise<void> {
    await Assertions.expectElementToNotBeVisible(this.longButton, {
      description: 'Market Insights Long button is not visible',
    });
  }

  async expectShortButtonVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.shortButton, {
      description: 'Market Insights Short button is visible',
    });
  }

  async expectShortButtonNotVisible(): Promise<void> {
    await Assertions.expectElementToNotBeVisible(this.shortButton, {
      description: 'Market Insights Short button is not visible',
    });
  }

  async expectSwapButtonVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.swapButton, {
      description: 'Market Insights Swap button is visible',
    });
  }

  async expectBuyButtonVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.buyButton, {
      description: 'Market Insights Buy button is visible',
    });
  }

  async tapSwapButton(): Promise<void> {
    await Gestures.tap(this.swapButton, {
      elemDescription: 'Tap Market Insights Swap button',
    });
  }

  async tapBuyButton(): Promise<void> {
    await Gestures.tap(this.buyButton, {
      elemDescription: 'Tap Market Insights Buy button',
    });
  }

  async tapTrendItem(index: number): Promise<void> {
    await Gestures.tap(this.trendItem(index), {
      elemDescription: `Tap Market Insights trend item ${index}`,
    });
  }

  async scrollToThumbsUp(): Promise<void> {
    await Gestures.scrollToElement(this.thumbsUpButton, this.scrollView, {
      elemDescription: 'Scroll to Market Insights thumbs up button',
    });
  }

  async tapThumbsUpButton(): Promise<void> {
    await Gestures.tap(this.thumbsUpButton, {
      elemDescription: 'Tap Market Insights thumbs up button',
    });
  }

  get thumbsUpFilledIcon() {
    return Matchers.getElementByID('icon-ThumbUpFilled');
  }

  async expectThumbsUpButtonVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.thumbsUpButton, {
      description: 'Market Insights thumbs up button is visible',
    });
  }

  async expectThumbsUpFilled(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.thumbsUpFilledIcon, {
      description:
        'Market Insights thumbs up filled icon is visible after tapping',
    });
  }

  async tapThumbsDownButton(): Promise<void> {
    await Gestures.tap(this.thumbsDownButton, {
      elemDescription: 'Tap Market Insights thumbs down button',
    });
  }

  get feedbackBottomSheet() {
    return Matchers.getElementByID(
      MarketInsightsSelectorsIDs.FEEDBACK_BOTTOM_SHEET,
    );
  }

  async expectThumbsDownButtonVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.thumbsDownButton, {
      description: 'Market Insights thumbs down button is visible',
    });
  }

  async expectFeedbackBottomSheetVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.feedbackBottomSheet, {
      description: 'Market Insights feedback bottom sheet is visible',
    });
  }
}

export default new MarketInsightsView();
