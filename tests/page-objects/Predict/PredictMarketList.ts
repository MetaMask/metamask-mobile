import {
  Assertions,
  Gestures,
  Matchers,
  PlaywrightMatchers,
  UnifiedGestures,
  encapsulated,
  type EncapsulatedElementType,
} from '../../framework';
import {
  PredictBalanceSelectorsIDs,
  PredictBalanceSelectorsText,
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
      detox: () =>
        Matchers.getElementByID(PredictMarketListSelectorsIDs.CATEGORY_TABS),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PredictMarketListSelectorsIDs.CATEGORY_TABS,
          { exact: true },
        ),
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
    await UnifiedGestures.waitAndTap(this.getMarketCard(category, cardIndex), {
      description: `Predict market card ${cardIndex} in ${category} category`,
    });
  }

  async tapCategoryTab(category: CategoryTab): Promise<void> {
    await UnifiedGestures.waitAndTap(this.getCategoryTab(category), {
      description: `${category} category tab`,
    });
  }

  /**
   * Taps Yes on a feed card. Prefers stable testIDs; falls back to label text because
   * legacy Button / accessibility nesting may not expose nested testIDs to Detox on iOS.
   */
  async tapYesBasedOnCategoryAndIndex(
    category: CategoryTab = 'new',
    cardIndex: number = 1,
  ): Promise<void> {
    const cardId = getPredictMarketListSelector.marketCardByCategory(
      category,
      cardIndex,
    );
    await Assertions.expectElementToBeVisible(
      this.getMarketCard(category, cardIndex),
      {
        timeout: 30000,
        description: `Predict market card ${cardIndex} (${category}) should load before Yes tap`,
      },
    );

    const yesById = element(
      by.id(getPredictMarketListSelector.marketCardBetYes(category, cardIndex)),
    ) as unknown as DetoxElement;
    const yesByText = element(
      by.text('Yes').withAncestor(by.id(cardId)),
    ) as unknown as DetoxElement;
    const yesBySportLabel = element(
      by.text(/^YES · /).withAncestor(by.id(cardId)),
    ) as unknown as DetoxElement;

    try {
      await Gestures.waitAndTap(yesById, {
        timeout: 6000,
        elemDescription: `Tap Yes (testID) in ${category} feed index ${cardIndex}`,
      });
    } catch {
      try {
        await Gestures.waitAndTap(yesByText, {
          timeout: 12000,
          elemDescription: `Tap Yes (text) in ${category} feed index ${cardIndex}`,
        });
      } catch {
        await Gestures.waitAndTap(yesBySportLabel, {
          timeout: 12000,
          elemDescription: `Tap Yes (sports YES · price label) in ${category} feed index ${cardIndex}`,
        });
      }
    }
  }

  /**
   * Taps No on a feed card. After a full-screen / modal step, FlashList may recycle cells and
   * the per-card testID can briefly disappear; we fall back to matchers scoped to the list.
   */
  async tapNoBasedOnCategoryAndIndex(
    category: CategoryTab = 'new',
    cardIndex: number = 1,
  ): Promise<void> {
    const cardId = getPredictMarketListSelector.marketCardByCategory(
      category,
      cardIndex,
    );
    const listId = getPredictFeedSelector.marketList(category);

    const noById = element(
      by.id(getPredictMarketListSelector.marketCardBetNo(category, cardIndex)),
    ) as unknown as DetoxElement;
    const noByTextCard = element(
      by.text('No').withAncestor(by.id(cardId)),
    ) as unknown as DetoxElement;
    const noBySportCard = element(
      by.text(/^NO · /).withAncestor(by.id(cardId)),
    ) as unknown as DetoxElement;
    const noByTextList = element(
      by.text('No').withAncestor(by.id(listId)),
    ) as unknown as DetoxElement;
    const noBySportList = element(
      by.text(/^NO · /).withAncestor(by.id(listId)),
    ) as unknown as DetoxElement;

    try {
      await Gestures.waitAndTap(noById, {
        timeout: 6000,
        elemDescription: `Tap No (testID) in ${category} feed index ${cardIndex}`,
      });
    } catch {
      try {
        await Gestures.waitAndTap(noByTextCard, {
          timeout: 8000,
          elemDescription: `Tap No (text, card ancestor) in ${category} feed index ${cardIndex}`,
        });
      } catch {
        try {
          await Gestures.waitAndTap(noBySportCard, {
            timeout: 8000,
            elemDescription: `Tap No (sports label, card ancestor) in ${category} feed index ${cardIndex}`,
          });
        } catch {
          try {
            await Gestures.waitAndTap(noByTextList, {
              timeout: 12000,
              elemDescription: `Tap No (text, list ancestor) in ${category} feed index ${cardIndex}`,
            });
          } catch {
            await Gestures.waitAndTap(noBySportList, {
              timeout: 12000,
              elemDescription: `Tap No (sports label, list ancestor) in ${category} feed index ${cardIndex}`,
            });
          }
        }
      }
    }
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
