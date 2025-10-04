import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import Utilities from '../../framework/Utilities';
import { PredictTabViewSelectorsIDs } from '../../selectors/Predict/Predict.selectors';

class PredictTabView {
  get container(): DetoxElement {
    return Matchers.getElementByID(PredictTabViewSelectorsIDs.CONTAINER);
  }

  get flashList(): DetoxElement {
    return Matchers.getElementByID(PredictTabViewSelectorsIDs.FLASH_LIST);
  }

  get refreshControl(): DetoxElement {
    return Matchers.getElementByID(PredictTabViewSelectorsIDs.REFRESH_CONTROL);
  }

  get marketsWonCard(): DetoxElement {
    return Matchers.getElementByID(PredictTabViewSelectorsIDs.MARKETS_WON_CARD);
  }

  get claimButton(): DetoxElement {
    return Matchers.getElementByID(PredictTabViewSelectorsIDs.MARKETS_WON_CLAIM_BUTTON);
  }

  get predictNewButton(): DetoxElement {
    return Matchers.getElementByID(PredictTabViewSelectorsIDs.PREDICT_NEW_BUTTON);
  }

  get emptyState(): DetoxElement {
    return Matchers.getElementByID(PredictTabViewSelectorsIDs.EMPTY_STATE);
  }

  get emptyStateIcon(): DetoxElement {
    return Matchers.getElementByID(PredictTabViewSelectorsIDs.EMPTY_STATE_ICON);
  }

  get emptyStateTitle(): DetoxElement {
    return Matchers.getElementByID(PredictTabViewSelectorsIDs.EMPTY_STATE_TITLE);
  }

  get emptyStateDescription(): DetoxElement {
    return Matchers.getElementByID(PredictTabViewSelectorsIDs.EMPTY_STATE_DESCRIPTION);
  }

  get emptyStateExploreButton(): DetoxElement {
    return Matchers.getElementByID(PredictTabViewSelectorsIDs.EMPTY_STATE_EXPLORE_BUTTON);
  }

  get loadingContainer(): DetoxElement {
    return Matchers.getElementByID(PredictTabViewSelectorsIDs.LOADING_CONTAINER);
  }

  get errorContainer(): DetoxElement {
    return Matchers.getElementByID(PredictTabViewSelectorsIDs.ERROR_CONTAINER);
  }

  get errorText(): DetoxElement {
    return Matchers.getElementByID(PredictTabViewSelectorsIDs.ERROR_TEXT);
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
}

export default new PredictTabView();
