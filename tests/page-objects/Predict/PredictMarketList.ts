import {
  Assertions,
  Gestures,
  Matchers,
  PlatformDetector,
  Utilities,
  sleep,
  type AppiumElement,
} from '../../framework';
import { resolveE2EWaitTimeoutMs } from '../../framework/Constants';
import { withImplicitWait } from '../../framework/AppiumUtilities';
import {
  PredictBalanceSelectorsIDs,
  PredictBalanceSelectorsText,
  PredictFeedSelectorsIDs,
  PredictMarketListSelectorsIDs,
  getPredictFeedSelector,
  getPredictMarketListSelector,
} from '../../../app/components/UI/Predict/Predict.testIds';
import { PREDICT_PORTFOLIO_TEST_IDS } from '../../../app/components/UI/Predict/views/PredictHome/components/PredictPortfolio/PredictPortfolio.testIds';

type CategoryTab = 'trending' | 'new' | 'sports' | 'crypto' | 'politics';
type CategoryTabScrollDirection = 'left' | 'right';

const CATEGORY_LABELS: Record<CategoryTab, string> = {
  trending: 'Trending',
  new: 'New',
  sports: 'Sports',
  crypto: 'Crypto',
  politics: 'Politics',
};

const IOS_MARKET_LIST_INDICATOR_IDS = [
  PredictFeedSelectorsIDs.TABS,
  PredictFeedSelectorsIDs.HEADER,
  PredictFeedSelectorsIDs.TAB_BAR_CONTAINER,
  PredictMarketListSelectorsIDs.BACK_BUTTON,
] as const;

const MARKET_LIST_POLL_INTERVAL_MS = 250;

class PredictMarketList {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(PredictMarketListSelectorsIDs.CONTAINER);
  }

  get errorContainer(): Promise<AppiumElement> {
    return Matchers.getElementByID(PredictMarketListSelectorsIDs.EMPTY_STATE);
  }

  get categoryTabs(): Promise<AppiumElement> {
    return Matchers.getElementByID(PredictFeedSelectorsIDs.TABS);
  }

  get backButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(PredictMarketListSelectorsIDs.BACK_BUTTON);
  }

  get addFundsButton(): Promise<AppiumElement> {
    return Matchers.getElementByText('Add funds');
  }

  get claimButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(PREDICT_PORTFOLIO_TEST_IDS.CLAIM_BUTTON);
  }

  get balanceCard(): Promise<AppiumElement> {
    return Matchers.getElementByID(PredictBalanceSelectorsIDs.BALANCE_CARD);
  }

  get availableBalanceLabel(): Promise<AppiumElement> {
    return Matchers.getElementByText(
      PredictBalanceSelectorsText.AVAILABLE_BALANCE,
    );
  }

  get trendingSkeleton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      getPredictFeedSelector.skeletonLoading('trending', 1),
    );
  }

  get firstTrendingMarketCard(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      getPredictMarketListSelector.marketCardByCategory('trending', 1),
    );
  }

  get firstYesButton(): Promise<AppiumElement> {
    return Matchers.getElementByText('Yes');
  }

  get getIsraelXHezbollahCeasefireButton(): Promise<AppiumElement> {
    return Matchers.getElementByNativeXPath(
      '//*[contains(@content-desc, "Israel x Hezbollah ceasefire by")]',
    );
  }

  getMarketCard(
    category: CategoryTab,
    cardIndex: number,
  ): Promise<AppiumElement> {
    const marketCardId = getPredictMarketListSelector.marketCardByCategory(
      category,
      cardIndex,
    );

    return Matchers.getElementByID(marketCardId);
  }

  getPositionItem(positionId: string): Promise<AppiumElement> {
    const selector = `position-${positionId}`;
    return Matchers.getElementByID(selector);
  }

  getCategoryTab(category: CategoryTab): Promise<AppiumElement> {
    const label = CATEGORY_LABELS[category];
    return Matchers.getElementByText(label);
  }

  /**
   * Reveal an off-screen feed category tab, then tap it.
   * Appium scrolls the tab into view or swipes the tab bar horizontally.
   *
   * @param options.direction - Scroll the tab bar toward this edge to reveal the target (`right` = tabs further right, e.g. Sports; `left` = tabs further left).
   */
  private async scrollAndTapCategoryTab(
    tab: Promise<AppiumElement>,
    description: string,
    options: {
      direction?: CategoryTabScrollDirection;
      maxSwipeAttempts?: number;
      swipePercentage?: number;
      timeout?: number;
    } = {},
  ): Promise<void> {
    const {
      direction = 'right',
      maxSwipeAttempts = 6,
      swipePercentage = 0.75,
      timeout = 30_000,
    } = options;
    const appiumSwipeDirection = direction === 'right' ? 'left' : 'right';
    const tabsBar = await this.categoryTabs;

    await Utilities.executeWithRetry(
      async () => {
        for (let attempt = 0; attempt < maxSwipeAttempts; attempt += 1) {
          try {
            await Assertions.expectElementToBeVisible(tab, {
              timeout: 1000,
            });
            return;
          } catch {
            try {
              await Gestures.scrollIntoView(tab, {
                direction,
                scrollableElement: tabsBar,
                maxScrolls: 2,
              });
            } catch {
              await Gestures.swipe(this.categoryTabs, appiumSwipeDirection, {
                elemDescription: `Swipe tabs ${direction} to reveal ${description} (attempt ${attempt + 1})`,
                percentage: swipePercentage,
              });
            }
          }
        }
        await Assertions.expectElementToBeVisible(tab, { timeout: 3000 });
      },
      {
        timeout,
        description: `Reveal ${description}`,
      },
    );
    await Gestures.waitAndTap(tab, {
      elemDescription: description,
      checkStability: true,
      timeout: 15_000,
    });
  }

  getMarketOutcomeButton(
    category: CategoryTab,
    cardIndex: number,
    outcome: 'Yes' | 'No',
  ): Promise<AppiumElement> {
    const parentId = getPredictMarketListSelector.marketCardByCategory(
      category,
      cardIndex,
    );

    return Matchers.getElementByNativeXPath(
      `//*[contains(@resource-id,'${parentId}') or contains(@name,'${parentId}')]//*[(@text='${outcome}' or @content-desc='${outcome}' or @label='${outcome}' or @name='${outcome}')]`,
    );
  }

  async tapMarketCard(
    category: CategoryTab = 'trending',
    cardIndex: number = 1,
  ): Promise<void> {
    const card = this.getMarketCard(category, cardIndex);
    const listContainerId = getPredictFeedSelector.marketList(category);

    await Utilities.executeWithRetry(
      async () => {
        try {
          await Assertions.expectElementToBeVisible(card, { timeout: 3000 });
        } catch {
          await Gestures.scrollToElement(card, listContainerId, {
            elemDescription: `Predict market card ${cardIndex} in ${category}`,
            direction: 'down',
          });
          await Assertions.expectElementToBeVisible(card, { timeout: 10_000 });
        }
        await Gestures.waitAndTap(card, {
          elemDescription: `Predict market card ${cardIndex} in ${category} category`,
          timeout: 15_000,
        });
      },
      {
        timeout: 60_000,
        description: `Tap predict market card ${cardIndex} in ${category}`,
      },
    );
  }

  async tapCategoryTab(
    category: CategoryTab,
    options: { direction?: CategoryTabScrollDirection } = {},
  ): Promise<void> {
    const tab = this.getCategoryTab(category);
    await this.scrollAndTapCategoryTab(
      tab,
      `${CATEGORY_LABELS[category]} category tab`,
      options,
    );
    await Assertions.expectElementToBeVisible(this.getMarketCard(category, 1), {
      timeout: 60_000,
      description: `${category} feed first market card loaded`,
    });
  }

  async tapYesBasedOnCategoryAndIndex(
    category: CategoryTab = 'new',
    cardIndex: number = 1,
  ): Promise<void> {
    await Gestures.waitAndTap(
      this.getMarketOutcomeButton(category, cardIndex, 'Yes'),
      {
        elemDescription: `Yes option in ${category} feed index ${cardIndex}`,
      },
    );
  }

  async tapNoBasedOnCategoryAndIndex(
    category: CategoryTab = 'new',
    cardIndex: number = 1,
  ): Promise<void> {
    await Gestures.waitAndTap(
      this.getMarketOutcomeButton(category, cardIndex, 'No'),
      {
        elemDescription: `No option in ${category} feed index ${cardIndex}`,
      },
    );
  }

  async tapAddFundsButton(): Promise<void> {
    await Gestures.waitAndTap(this.addFundsButton, {
      elemDescription: 'Predict add funds button',
    });
  }

  async tapClaimButton(): Promise<void> {
    await Gestures.waitAndTap(this.claimButton, {
      elemDescription: 'Predict claim winnings button',
    });
  }

  async tapBackButton(): Promise<void> {
    await Gestures.waitAndTap(this.backButton, {
      elemDescription: 'Back button on predict market list',
    });
  }

  /**
   * Waits for the predict market list screen to be ready.
   * On iOS, `predict-market-list-container` may exist but report
   * `displayed === false` while feed chrome is already interactive.
   */
  async waitForScreenToDisplay(
    options: { timeout?: number; description?: string } = {},
  ): Promise<void> {
    const {
      timeout = resolveE2EWaitTimeoutMs(30_000),
      description = 'Predict market list container should be visible',
    } = options;

    if (PlatformDetector.isAndroid()) {
      await Assertions.expectElementToBeVisible(this.container, {
        timeout,
        description,
      });
      return;
    }

    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      for (const testId of IOS_MARKET_LIST_INDICATOR_IDS) {
        try {
          const displayed = await withImplicitWait(500, async () => {
            const el = await Matchers.getElementByID(testId);
            return el.isVisible();
          });
          if (displayed) {
            return;
          }
        } catch {
          // try next indicator
        }
      }

      try {
        const containerExists = await withImplicitWait(500, async () => {
          const el = await this.container;
          return el.unwrap().isExisting();
        });
        if (containerExists) {
          return;
        }
      } catch {
        // keep polling
      }

      await sleep(MARKET_LIST_POLL_INTERVAL_MS);
    }

    await Assertions.expectElementToBeVisible(this.container, {
      timeout: 5_000,
      description,
    });
  }
}

export default new PredictMarketList();
