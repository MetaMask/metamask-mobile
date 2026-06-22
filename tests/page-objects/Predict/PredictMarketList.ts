import {
  Assertions,
  Gestures,
  Matchers,
  PlaywrightGestures,
  PlaywrightMatchers,
  UnifiedGestures,
  Utilities,
  asPlaywrightElement,
  encapsulated,
  encapsulatedAction,
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
type CategoryTabScrollDirection = 'left' | 'right';

/** Tab indices in {@link PredictFeedSelectorsIDs.TABS} — must match PREDICT_BASE_TABS order. */
const CATEGORY_TAB_INDEX: Record<CategoryTab, number> = {
  trending: 0,
  new: 2,
  sports: 3,
  crypto: 4,
  politics: 5,
};

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
    const tabTestId = getPredictFeedSelector.tab(CATEGORY_TAB_INDEX[category]);

    return encapsulated({
      detox: () => Matchers.getElementByID(tabTestId),
      appium: () => PlaywrightMatchers.getElementByText(label),
    });
  }

  /**
   * Reveal an off-screen feed category tab, then tap it.
   * TabsBar testID is on the outer wrapper (not the inner ScrollView), so Detox
   * swipes the bar horizontally; Appium scrolls the tab into view.
   *
   * @param options.direction - Scroll the tab bar toward this edge to reveal the target (`right` = tabs further right, e.g. Sports; `left` = tabs further left).
   */
  private async scrollAndTapCategoryTab(
    tab: EncapsulatedElementType,
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
    const detoxSwipeDirection = direction === 'right' ? 'left' : 'right';

    await encapsulatedAction({
      detox: async () => {
        const tabEl = (await tab) as Detox.IndexableNativeElement;

        await Utilities.executeWithRetry(
          async () => {
            for (let attempt = 0; attempt < maxSwipeAttempts; attempt += 1) {
              try {
                await waitFor(tabEl).toBeVisible().withTimeout(1000);
                return;
              } catch {
                await Gestures.swipe(this.categoryTabs, detoxSwipeDirection, {
                  elemDescription: `Swipe tabs ${direction} to reveal ${description} (attempt ${attempt + 1})`,
                  speed: 'slow',
                  percentage: swipePercentage,
                });
              }
            }
            await waitFor(tabEl).toBeVisible().withTimeout(3000);
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
      },
      appium: async () => {
        const tabEl = await asPlaywrightElement(tab);
        const tabsBar = await asPlaywrightElement(this.categoryTabs);
        const appiumSwipeDirection = direction === 'right' ? 'left' : 'right';

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
                  await PlaywrightGestures.scrollIntoView(tabEl, {
                    scrollParams: { direction },
                    scrollableElement: tabsBar,
                    maxScrolls: 2,
                  });
                } catch {
                  await UnifiedGestures.swipe(
                    this.categoryTabs,
                    appiumSwipeDirection,
                    {
                      description: `Swipe tabs ${direction} to reveal ${description} (attempt ${attempt + 1})`,
                      percentage: swipePercentage,
                    },
                  );
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
        await PlaywrightGestures.waitAndTap(tabEl, {
          timeout: 15_000,
          checkForStable: true,
        });
      },
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
