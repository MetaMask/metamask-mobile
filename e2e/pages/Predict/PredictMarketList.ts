import { Gestures, Matchers } from '../../framework';
import {
  PredictMarketListSelectorsIDs,
  getPredictMarketListSelector,
  PredictBalanceSelectorsIDs,
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
  get balanceCardContainer(): DetoxElement {
    return Matchers.getElementByID(PredictBalanceSelectorsIDs.BALANCE_CARD);
  }
  get withdrawButton(): DetoxElement {
    return Matchers.getElementByID(PredictBalanceSelectorsIDs.WITHDRAW_BUTTON);
  }
  get depositButton(): DetoxElement {
    return Matchers.getElementByID(PredictBalanceSelectorsIDs.DEPOSIT_BUTTON);
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
  async tapWithdrawButton(): Promise<void> {
    await Gestures.waitAndTap(this.withdrawButton, {
      elemDescription: 'Withdraw button',
    });
  }
  async tapDepositButton(): Promise<void> {
    await Gestures.waitAndTap(this.depositButton, {
      elemDescription: 'Deposit button',
    });
  }
}

export default new PredictMarketList();
