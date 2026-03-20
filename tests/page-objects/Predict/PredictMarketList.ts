import {
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
