import Matchers from '../../framework/Matchers';
import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import { MarketInsightsSelectorsIDs } from '../../../app/components/UI/MarketInsights/MarketInsights.testIds';

class MarketInsightsEntryCard {
  get entryCard() {
    return Matchers.getElementByID(MarketInsightsSelectorsIDs.ENTRY_CARD);
  }

  get entryCardHeadline() {
    return Matchers.getElementByID(
      MarketInsightsSelectorsIDs.ENTRY_CARD_HEADLINE,
    );
  }

  get entryCardSkeleton() {
    return Matchers.getElementByID(
      MarketInsightsSelectorsIDs.ENTRY_CARD_SKELETON,
    );
  }

  async expectEntryCardVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.entryCard, {
      description: 'Market Insights entry card is visible on asset details',
    });
  }

  async expectEntryCardHeadlineVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.entryCardHeadline, {
      description:
        'Market Insights entry card headline is visible on asset details',
    });
  }

  async tapEntryCard(): Promise<void> {
    await Gestures.tap(this.entryCard, {
      elemDescription: 'Tap on Market Insights entry card',
    });
  }

  async expectEntryCardNotVisible(): Promise<void> {
    await Assertions.expectElementToNotBeVisible(this.entryCard, {
      description: 'Market Insights entry card is not visible on asset details',
    });
  }
}

export default new MarketInsightsEntryCard();
