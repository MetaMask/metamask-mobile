import { Gestures, Matchers } from '../../framework';
import {
  PredictMarketListSelectorsIDs,
  getPredictMarketListSelector,
} from '../../selectors/Predict/Predict.selectors';

// Type for category tabs
type CategoryTab = 'trending' | 'new' | 'sports' | 'crypto' | 'politics';

class PredictMarketList {
  get container(): DetoxElement {
    return Matchers.getElementByID(PredictMarketListSelectorsIDs.CONTAINER);
  }

  get errorContainer(): DetoxElement {
    return Matchers.getElementByID(PredictMarketListSelectorsIDs.EMPTY_STATE);
  }

  get categoryTabs(): DetoxElement {
    return Matchers.getElementByID(PredictMarketListSelectorsIDs.CATEGORY_TABS);
  }
  get backButton(): DetoxElement {
    return Matchers.getElementByID(PredictMarketListSelectorsIDs.BACK_BUTTON);
  }

  getMarketCard(category: CategoryTab, cardIndex: number): DetoxElement {
    return Matchers.getElementByID(
      getPredictMarketListSelector.marketCardByCategory(category, cardIndex),
    );
  }

  getPositionItem(positionId: string): DetoxElement {
    return Matchers.getElementByID(`position-${positionId}`);
  }

  // Actions
  async tapMarketCard(
    category: CategoryTab = 'trending',
    cardIndex: number = 1,
  ): Promise<void> {
    const marketCard = this.getMarketCard(category, cardIndex);
    await Gestures.waitAndTap(marketCard, {
      elemDescription: `Tapping Predict Market Card ${cardIndex} in ${category} category`,
    });
  }

  async tapCategoryTab(category: CategoryTab): Promise<void> {
    const categoryLabels = {
      trending: 'Trending',
      new: 'New',
      sports: 'Sports',
      crypto: 'Crypto',
      politics: 'Politics',
    };

    const tabElement = (await Matchers.getElementByText(
      categoryLabels[category],
    )) as unknown as DetoxElement;
    await Gestures.waitAndTap(tabElement, {
      elemDescription: `Tapping ${category} category tab`,
    });
  }

  async tapYesBasedOnCategoryAndIndex(
    category: CategoryTab = 'new',
    cardIndex: number = 1,
  ): Promise<void> {
    const parentId = getPredictMarketListSelector.marketCardByCategory(
      category,
      cardIndex,
    );

    const yesByTextWithAncestor = element(
      by.text('Yes').withAncestor(by.id(parentId)),
    ) as unknown as DetoxElement;

    await Gestures.waitAndTap(yesByTextWithAncestor, {
      elemDescription: `Tap Yes in ${category} feed index ${cardIndex}`,
    });
  }

  async tapNoBasedOnCategoryAndIndex(
    category: CategoryTab = 'new',
    cardIndex: number = 1,
  ): Promise<void> {
    const parentId = getPredictMarketListSelector.marketCardByCategory(
      category,
      cardIndex,
    );

    const noByTextWithAncestor = element(
      by.text('No').withAncestor(by.id(parentId)),
    ) as unknown as DetoxElement;

    await Gestures.waitAndTap(noByTextWithAncestor, {
      elemDescription: `Tap No in ${category} feed index ${cardIndex}`,
    });
  }

  async tapBackButton(): Promise<void> {
    await Gestures.waitAndTap(this.backButton, {
      elemDescription: 'Tap Back button on market feed',
    });
  }
}

export default new PredictMarketList();
