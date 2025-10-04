import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import Utilities from '../../framework/Utilities';
import { PredictMarketListSelectorsIDs, PredictTabViewSelectorsIDs, getPredictMarketListSelector } from '../../selectors/Predict/Predict.selectors';

class PredictMarketList {
  get container(): DetoxElement {
    return Matchers.getElementByID(PredictMarketListSelectorsIDs.CONTAINER);
  }

  get errorContainer(): DetoxElement {
    return Matchers.getElementByID(PredictMarketListSelectorsIDs.EMPTY_STATE);
  }

  get claimButton(): DetoxElement {
    return Matchers.getElementByID(PredictTabViewSelectorsIDs.MARKETS_WON_CLAIM_BUTTON);
  }

  get predictNewButton(): DetoxElement {
    return Matchers.getElementByID(PredictTabViewSelectorsIDs.PREDICT_NEW_BUTTON);
  }

  get emptyStateExploreButton(): DetoxElement {
    return Matchers.getElementByID(PredictTabViewSelectorsIDs.EMPTY_STATE_EXPLORE_BUTTON);
  }

  get refreshControl(): DetoxElement {
    return Matchers.getElementByID(PredictTabViewSelectorsIDs.REFRESH_CONTROL);
  }

  get marketsWonCard(): DetoxElement {
    return Matchers.getElementByID(PredictTabViewSelectorsIDs.MARKETS_WON_CARD);
  }

  get emptyState(): DetoxElement {
    return Matchers.getElementByID(PredictTabViewSelectorsIDs.EMPTY_STATE);
  }

  get loadingContainer(): DetoxElement {
    return Matchers.getElementByID(PredictTabViewSelectorsIDs.LOADING_CONTAINER);
  }

  // Market card methods
  getMarketCard(cardIndex: number): DetoxElement {
    return Matchers.getElementByID(getPredictMarketListSelector.marketCard(cardIndex));
  }

  // Dynamic selectors
  getPositionItem(positionId: string): DetoxElement {
    return Matchers.getElementByID(`position-${positionId}`);
  }

  getSkeletonLoading(index: number): DetoxElement {
    return Matchers.getElementByID(`skeleton-loading-${index}`);
  }

  // Actions
  async tapClaimButton(): Promise<void> {
    await Gestures.waitAndTap(this.claimButton, {
      elemDescription: 'Predict Markets Won Claim Button',
    });
  }

  async tapPredictNewButton(): Promise<void> {
    await Gestures.waitAndTap(this.predictNewButton, {
      elemDescription: 'Predict New Button',
    });
  }

  async tapEmptyStateExploreButton(): Promise<void> {
    await Gestures.waitAndTap(this.emptyStateExploreButton, {
      elemDescription: 'Predict Empty State Explore Button',
    });
  }

  async tapPositionItem(positionId: string): Promise<void> {
    const positionElement = this.getPositionItem(positionId);
    await Gestures.waitAndTap(positionElement, {
      elemDescription: `Predict Position Item ${positionId}`,
    });
  }

  async tapMarketCard(cardIndex: number): Promise<void> {
    const marketCard = this.getMarketCard(cardIndex);
    await Gestures.waitAndTap(marketCard, {
      elemDescription: `Tapping Predict Market Card ${cardIndex}`,
    });
  }

  async pullToRefresh(): Promise<void> {
    await Gestures.waitAndTap(this.refreshControl, {
      elemDescription: 'Predict Tab View Refresh Control',
    });
  }

  // Verification methods
  async isContainerVisible(): Promise<boolean> {
    return await Utilities.isElementVisible(this.container, 5000);
  }

  async isMarketsWonCardVisible(): Promise<boolean> {
    return await Utilities.isElementVisible(this.marketsWonCard, 5000);
  }

  async isEmptyStateVisible(): Promise<boolean> {
    return await Utilities.isElementVisible(this.emptyState, 5000);
  }

  async isLoadingStateVisible(): Promise<boolean> {
    return await Utilities.isElementVisible(this.loadingContainer, 5000);
  }

  async isErrorStateVisible(): Promise<boolean> {
    return await Utilities.isElementVisible(this.errorContainer, 5000);
  }

  async isMarketCardVisible(cardIndex: number): Promise<boolean> {
    const marketCard = this.getMarketCard(cardIndex);
    return await Utilities.isElementVisible(marketCard, 5000);
  }

  async isMarketListEmptyStateVisible(): Promise<boolean> {
    const emptyState = Matchers.getElementByID(getPredictMarketListSelector.emptyState());
    return await Utilities.isElementVisible(emptyState, 5000);
  }
}

export default new PredictMarketList();
