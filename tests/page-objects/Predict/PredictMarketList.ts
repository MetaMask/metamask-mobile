import {
  Assertions,
  Gestures,
  Matchers,
  PlatformDetector,
  PlaywrightAssertions,
  PlaywrightGestures,
  PlaywrightMatchers,
  UnifiedGestures,
  Utilities,
  asPlaywrightElement,
  encapsulated,
  encapsulatedAction,
  sleep,
  type EncapsulatedElementType,
} from '../../framework';
import { resolveE2EWaitTimeoutMs } from '../../framework/Constants';
import { withImplicitWait } from '../../framework/PlaywrightUtilities';
import {
  PredictBalanceSelectorsIDs,
  PredictBalanceSelectorsText,
  PredictFeedSelectorsIDs,
  PredictMarketListSelectorsIDs,
  PredictSearchSelectorsIDs,
  getPredictFeedSelector,
  getPredictMarketListSelector,
  getPredictSearchSelector,
} from '../../../app/components/UI/Predict/Predict.testIds';
import { TEXTFIELDSEARCH_TEST_ID } from '../../../app/component-library/components/Form/TextFieldSearch/TextFieldSearch.constants';

type CategoryTab = 'trending' | 'new' | 'sports' | 'crypto' | 'politics';
type CategoryTabScrollDirection = 'left' | 'right';

/** TabsBar assigns `predict-feed-tabs-tab-{runtimeIndex}`; match pressable by label, not fixed index. */
const PREDICT_FEED_TAB_PRESSABLE_ID = new RegExp(
  `^${PredictFeedSelectorsIDs.TABS}-tab-\\d+$`,
);

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

  get searchButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(PredictSearchSelectorsIDs.SEARCH_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PredictSearchSelectorsIDs.SEARCH_BUTTON,
          { exact: true },
        ),
    });
  }

  get searchInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(TEXTFIELDSEARCH_TEST_ID),
      appium: () =>
        PlaywrightMatchers.getElementById(TEXTFIELDSEARCH_TEST_ID, {
          exact: true,
        }),
    });
  }

  getSearchResultCard(cardIndex: number): EncapsulatedElementType {
    const resultCardId = getPredictSearchSelector.resultCard(cardIndex);
    return encapsulated({
      detox: () => Matchers.getElementByID(resultCardId),
      appium: () =>
        PlaywrightMatchers.getElementById(resultCardId, { exact: true }),
    });
  }

  getMarketByTitle(title: string | RegExp): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText(title),
      appium: () => PlaywrightMatchers.getElementByText(title),
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
      detox: () =>
        element(
          by
            .id(PREDICT_FEED_TAB_PRESSABLE_ID)
            .withAncestor(by.id(PredictFeedSelectorsIDs.TABS))
            .withDescendant(by.text(label)),
        ) as unknown as DetoxElement,
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

  async tapSearchButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.searchButton, {
      description: 'Predict search button',
    });
  }

  async typeSearchQuery(query: string): Promise<void> {
    await UnifiedGestures.typeText(this.searchInput, query, {
      description: 'Predict search input',
      hideKeyboard: true,
    });
  }

  async tapSearchResultCard(cardIndex: number = 0): Promise<void> {
    const card = this.getSearchResultCard(cardIndex);
    await UnifiedGestures.waitAndTap(card, {
      description: `Predict search result card ${cardIndex}`,
      timeout: 60_000,
    });
  }

  async tapMarketByTitle(title: string | RegExp): Promise<void> {
    const market = this.getMarketByTitle(title);
    const titleDescription =
      title instanceof RegExp ? title.source : String(title);

    await Utilities.executeWithRetry(
      async () => {
        await Assertions.expectElementToBeVisible(market, {
          timeout: 15_000,
          description: `Predict market titled ${titleDescription}`,
        });
        await UnifiedGestures.waitAndTap(market, {
          description: `Predict market titled ${titleDescription}`,
          timeout: 15_000,
        });
      },
      {
        timeout: 60_000,
        description: `Tap predict market titled ${titleDescription}`,
      },
    );
  }

  async tapBackButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.backButton, {
      description: 'Back button on predict market list',
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

    await encapsulatedAction({
      detox: async () => {
        await Assertions.expectElementToBeVisible(this.container, {
          timeout,
          description,
        });
      },
      appium: async () => {
        if (PlatformDetector.isAndroid()) {
          await PlaywrightAssertions.expectElementToBeVisible(
            asPlaywrightElement(this.container),
            { timeout, description },
          );
          return;
        }

        const deadline = Date.now() + timeout;
        while (Date.now() < deadline) {
          for (const testId of IOS_MARKET_LIST_INDICATOR_IDS) {
            try {
              const displayed = await withImplicitWait(500, async () => {
                const el = await PlaywrightMatchers.getElementById(testId, {
                  exact: true,
                });
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
              const el = await asPlaywrightElement(this.container);
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

        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(this.container),
          { timeout: 5_000, description },
        );
      },
    });
  }
}

export default new PredictMarketList();
