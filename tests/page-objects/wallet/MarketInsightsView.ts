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

  async expectViewVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.container, {
      description: 'Market Insights detail view is visible',
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
}

export default new MarketInsightsView();
