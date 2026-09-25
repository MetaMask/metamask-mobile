import {
  Assertions,
  Gestures,
  Matchers,
  PlatformDetector,
  type AppiumElement,
} from '../../framework';
import { resolveE2EWaitTimeoutMs } from '../../framework/Constants';
import {
  PredictHomeSelectorsIDs,
  PredictMarketListSelectorsIDs,
} from '../../../app/components/UI/Predict/Predict.testIds';
import { PREDICT_CATEGORIES_SECTION_TEST_IDS } from '../../../app/components/UI/Predict/views/PredictHome/components/PredictCategoriesSection/PredictCategoriesSection.testIds';
import { PREDICT_PORTFOLIO_TEST_IDS } from '../../../app/components/UI/Predict/views/PredictHome/components/PredictPortfolio/PredictPortfolio.testIds';

export type PredictHomeCategoryId = 'politics' | 'sports' | 'crypto';

class PredictHome {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(PredictHomeSelectorsIDs.CONTAINER);
  }

  get scrollView(): Promise<AppiumElement> {
    return Matchers.getElementByID(PredictHomeSelectorsIDs.SCROLL_VIEW);
  }

  get backButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(PredictMarketListSelectorsIDs.BACK_BUTTON);
  }

  get addFundsButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(PREDICT_PORTFOLIO_TEST_IDS.ACTION_ADD_FUNDS);
  }

  get withdrawButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(PREDICT_PORTFOLIO_TEST_IDS.ACTION_WITHDRAW);
  }

  get positionsButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(PREDICT_PORTFOLIO_TEST_IDS.ACTION_POSITIONS);
  }

  get primaryValue(): Promise<AppiumElement> {
    return Matchers.getElementByID(PREDICT_PORTFOLIO_TEST_IDS.PRIMARY_VALUE);
  }

  getCategoryTile(category: PredictHomeCategoryId): Promise<AppiumElement> {
    return Matchers.getElementByID(
      `${PREDICT_CATEGORIES_SECTION_TEST_IDS.TILE_PREFIX}-${category}`,
    );
  }

  async waitForScreenToDisplay(
    options: { timeout?: number; description?: string } = {},
  ): Promise<void> {
    const {
      timeout = resolveE2EWaitTimeoutMs(30_000),
      description = 'Predict home should be visible',
    } = options;

    // iOS reports predict-home-container as existing but displayed=false
    // while home chrome is already interactive.
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

  async tapCategoryTile(category: PredictHomeCategoryId): Promise<void> {
    const tile = this.getCategoryTile(category);
    await Gestures.scrollToElement(tile, PredictHomeSelectorsIDs.SCROLL_VIEW, {
      direction: 'down',
      elemDescription: `Predict home ${category} category tile`,
    });
    await Gestures.waitAndTap(tile, {
      elemDescription: `Predict home ${category} category tile`,
    });
  }

  async tapAddFunds(): Promise<void> {
    await Gestures.waitAndTap(this.addFundsButton, {
      elemDescription: 'Predict home Add funds',
    });
  }

  async tapWithdraw(): Promise<void> {
    await Gestures.waitAndTap(this.withdrawButton, {
      elemDescription: 'Predict home Withdraw',
    });
  }

  async tapPositions(): Promise<void> {
    await Gestures.waitAndTap(this.positionsButton, {
      elemDescription: 'Predict home Positions',
    });
  }

  async tapBackButton(): Promise<void> {
    await Gestures.waitAndTap(this.backButton, {
      elemDescription: 'Back button on Predict home',
    });
  }

  async expectPrimaryValueVisible(
    options: { timeout?: number; description?: string } = {},
  ): Promise<void> {
    const {
      timeout = resolveE2EWaitTimeoutMs(20_000),
      description = 'Predict home portfolio value should be visible',
    } = options;

    await Assertions.expectElementToBeVisible(this.primaryValue, {
      timeout,
      description,
    });
  }

  async expectAmountDisplayed(amount: string): Promise<void> {
    await Assertions.expectTextDisplayed(amount, {
      description: `Predict home portfolio should display ${amount}`,
    });
  }
}

export default new PredictHome();
