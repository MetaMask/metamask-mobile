import {
  Assertions,
  Matchers,
  PlaywrightMatchers,
  UnifiedGestures,
  Utilities,
  encapsulated,
  type EncapsulatedElementType,
} from '../../framework';
import {
  PredictBalanceSelectorsIDs,
  PredictBalanceSelectorsText,
  PredictFeedSelectorsIDs,
  PredictMarketListSelectorsIDs,
  getPredictFeedSelector,
  getPredictMarketListSelector,
} from '../../../app/components/UI/Predict/Predict.testIds';

type CategoryTab = 'trending' | 'new' | 'sports' | 'crypto' | 'politics';

const CATEGORY_LABELS: Record<CategoryTab, string> = {
  trending: 'Trending',
  new: 'New',
  sports: 'Sports',
  crypto: 'Crypto',
  politics: 'Politics',
};

class PredictMarketList {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(PredictMarketListSelectorsIDs.CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PredictMarketListSelectorsIDs.CONTAINER,
          { exact: true },
        ),
    });
  }

  get errorContainer(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(PredictMarketListSelectorsIDs.EMPTY_STATE),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PredictMarketListSelectorsIDs.EMPTY_STATE,
          { exact: true },
        ),
    });
  }

  get categoryTabs(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(PredictFeedSelectorsIDs.TABS),
      appium: () =>
        PlaywrightMatchers.getElementById(PredictFeedSelectorsIDs.TABS, {
          exact: true,
        }),
    });
  }

  get backButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(PredictMarketListSelectorsIDs.BACK_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PredictMarketListSelectorsIDs.BACK_BUTTON,
          { exact: true },
        ),
    });
  }

  get addFundsButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText('Add funds'),
      appium: () => PlaywrightMatchers.getElementByText('Add funds'),
    });
  }

  get balanceCard(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(PredictBalanceSelectorsIDs.BALANCE_CARD),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PredictBalanceSelectorsIDs.BALANCE_CARD,
          {
            exact: true,
          },
        ),
    });
  }

  get availableBalanceLabel(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          PredictBalanceSelectorsText.AVAILABLE_BALANCE,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          PredictBalanceSelectorsText.AVAILABLE_BALANCE,
        ),
    });
  }

  get trendingSkeleton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          getPredictFeedSelector.skeletonLoading('trending', 1),
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          getPredictFeedSelector.skeletonLoading('trending', 1),
          { exact: true },
        ),
    });
  }

  get firstTrendingMarketCard(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          getPredictMarketListSelector.marketCardByCategory('trending', 1),
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          getPredictMarketListSelector.marketCardByCategory('trending', 1),
        ),
    });
  }

  get firstYesButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText('Yes'),
      appium: () => PlaywrightMatchers.getElementByText('Yes'),
    });
  }

  get getIsraelXHezbollahCeasefireButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText('No'),
      appium: () =>
        PlaywrightMatchers.getElementByXPath(
          '//*[contains(@content-desc, "Israel x Hezbollah ceasefire by")]',
        ),
    });
  }

  getMarketCard(
    category: CategoryTab,
    cardIndex: number,
  ): EncapsulatedElementType {
    const marketCardId = getPredictMarketListSelector.marketCardByCategory(
      category,
      cardIndex,
    );

    return encapsulated({
      detox: () => Matchers.getElementByID(marketCardId),
      appium: () =>
        PlaywrightMatchers.getElementById(marketCardId, { exact: true }),
    });
  }

  getPositionItem(positionId: string): EncapsulatedElementType {
    const selector = `position-${positionId}`;
    return encapsulated({
      detox: () => Matchers.getElementByID(selector),
      appium: () =>
        PlaywrightMatchers.getElementById(selector, { exact: true }),
    });
  }

  getCategoryTab(category: CategoryTab): EncapsulatedElementType {
    const label = CATEGORY_LABELS[category];

    return encapsulated({
      detox: () => Matchers.getElementByText(label),
      appium: () => PlaywrightMatchers.getElementByText(label),
    });
  }

  getMarketOutcomeButton(
    category: CategoryTab,
    cardIndex: number,
    outcome: 'Yes' | 'No',
  ): EncapsulatedElementType {
    const parentId = getPredictMarketListSelector.marketCardByCategory(
      category,
      cardIndex,
    );

    return encapsulated({
      detox: () =>
        element(
          by.text(outcome).withAncestor(by.id(parentId)),
        ) as unknown as DetoxElement,
      appium: () =>
        PlaywrightMatchers.getElementByXPath(
          `//*[contains(@resource-id,'${parentId}') or contains(@name,'${parentId}')]//*[(@text='${outcome}' or @content-desc='${outcome}' or @label='${outcome}' or @name='${outcome}')]`,
        ),
    });
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
          await UnifiedGestures.scrollToElement(card, listContainerId, {
            description: `Predict market card ${cardIndex} in ${category}`,
            direction: 'down',
          });
          await Assertions.expectElementToBeVisible(card, { timeout: 10_000 });
        }
        await UnifiedGestures.waitAndTap(card, {
          description: `Predict market card ${cardIndex} in ${category} category`,
          timeout: 15_000,
        });
      },
      {
        timeout: 60_000,
        description: `Tap predict market card ${cardIndex} in ${category}`,
      },
    );
  }

  async tapCategoryTab(category: CategoryTab): Promise<void> {
    const tab = this.getCategoryTab(category);
    const tabsScrollContainer = PredictFeedSelectorsIDs.TABS;

    await Utilities.executeWithRetry(
      async () => {
        for (let attempt = 0; attempt < 6; attempt += 1) {
          try {
            await Assertions.expectElementToBeVisible(tab, { timeout: 1000 });
            return;
          } catch {
            await UnifiedGestures.scrollToElement(tab, tabsScrollContainer, {
              description: `Scroll to reveal ${category} category tab (attempt ${attempt + 1})`,
              direction: 'right',
              scrollAmount: 150,
            });
          }
        }

        try {
          await Assertions.expectElementToBeVisible(tab, { timeout: 1000 });
          return;
        } catch {
          await UnifiedGestures.swipe(this.categoryTabs, 'left', {
            description: `Swipe tabs to reveal ${category} category tab`,
            speed: 'slow',
            percentage: 0.75,
          });
        }

        await Assertions.expectElementToBeVisible(tab, { timeout: 3000 });
      },
      {
        timeout: 30_000,
        description: `Scroll to ${category} category tab`,
      },
    );
    await UnifiedGestures.waitAndTap(tab, {
      description: `${category} category tab`,
      checkStability: true,
      timeout: 15_000,
    });
    await Assertions.expectElementToBeVisible(this.getMarketCard(category, 1), {
      timeout: 60_000,
      description: `${category} feed first market card loaded`,
    });
  }

  async tapYesBasedOnCategoryAndIndex(
    category: CategoryTab = 'new',
    cardIndex: number = 1,
  ): Promise<void> {
    await UnifiedGestures.waitAndTap(
      this.getMarketOutcomeButton(category, cardIndex, 'Yes'),
      {
        description: `Yes option in ${category} feed index ${cardIndex}`,
      },
    );
  }

  async tapNoBasedOnCategoryAndIndex(
    category: CategoryTab = 'new',
    cardIndex: number = 1,
  ): Promise<void> {
    await UnifiedGestures.waitAndTap(
      this.getMarketOutcomeButton(category, cardIndex, 'No'),
      {
        description: `No option in ${category} feed index ${cardIndex}`,
      },
    );
  }

  async tapAddFundsButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.addFundsButton, {
      description: 'Predict add funds button',
    });
  }

  async tapBackButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.backButton, {
      description: 'Back button on predict market list',
    });
  }
}

export default new PredictMarketList();
