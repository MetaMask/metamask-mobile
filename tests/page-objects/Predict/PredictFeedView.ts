import {
  Assertions,
  Gestures,
  Matchers,
  PlatformDetector,
  type AppiumElement,
} from '../../framework';
import { resolveE2EWaitTimeoutMs } from '../../framework/Constants';
import {
  PredictFeedViewSelectorsIDs,
  PredictMarketListSelectorsIDs,
  getPredictFeedViewSelector,
} from '../../../app/components/UI/Predict/Predict.testIds';

class PredictFeedView {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(PredictFeedViewSelectorsIDs.CONTAINER);
  }

  get backButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(PredictMarketListSelectorsIDs.BACK_BUTTON);
  }

  getMarketCard(cardIndex: number): Promise<AppiumElement> {
    return Matchers.getElementByID(
      getPredictFeedViewSelector.marketCard(cardIndex),
    );
  }

  getMarketOutcomeButton(
    cardIndex: number,
    outcome: 'Yes' | 'No',
  ): Promise<AppiumElement> {
    const parentId = getPredictFeedViewSelector.marketCard(cardIndex);

    return Matchers.getElementByNativeXPath(
      `//*[contains(@resource-id,'${parentId}') or contains(@name,'${parentId}')]//*[(@text='${outcome}' or @content-desc='${outcome}' or @label='${outcome}' or @name='${outcome}')]`,
    );
  }

  async waitForScreenToDisplay(
    options: { timeout?: number; description?: string } = {},
  ): Promise<void> {
    const {
      timeout = resolveE2EWaitTimeoutMs(30_000),
      description = 'Predict feed view should be visible',
    } = options;

    // iOS reports predict-feed-view-container as existing but displayed=false
    // while feed chrome is already interactive.
    if (PlatformDetector.isIOS()) {
      await Assertions.expectElementToExist(this.container, {
        timeout,
        description,
      });
      return;
    }

    await Assertions.expectElementToBeVisible(this.container, {
      timeout,
      description,
    });
  }

  async tapMarketCard(cardIndex: number = 1): Promise<void> {
    const card = this.getMarketCard(cardIndex);
    await Gestures.scrollToElement(
      card,
      PredictFeedViewSelectorsIDs.MARKET_LIST,
      {
        direction: 'down',
        elemDescription: `Predict feed market card ${cardIndex}`,
      },
    );
    await Gestures.waitAndTap(card, {
      elemDescription: `Predict feed market card ${cardIndex}`,
    });
  }

  async tapYesOnCard(cardIndex: number = 1): Promise<void> {
    await Gestures.waitAndTap(this.getMarketOutcomeButton(cardIndex, 'Yes'), {
      elemDescription: `Yes option on Predict feed card ${cardIndex}`,
    });
  }

  async tapBackButton(): Promise<void> {
    await Gestures.waitAndTap(this.backButton, {
      elemDescription: 'Back button on Predict feed view',
    });
  }
}

export default new PredictFeedView();
