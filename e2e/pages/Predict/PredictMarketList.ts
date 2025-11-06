import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
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
}

export default new PredictMarketList();
