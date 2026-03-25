import {
  PredictTabViewSelectorsIDs,
  PredictMarketListSelectorsIDs,
  getPredictMarketListSelector,
  PredictFeedSelectorsIDs,
  getPredictFeedSelector,
  PredictFeedMockSelectorsIDs,
  getPredictFeedMockSelector,
  PredictMarketDetailsSelectorsIDs,
  getPredictMarketDetailsSelector,
  PredictMarketDetailsSelectorsText,
  PredictPositionsHeaderSelectorsIDs,
  PredictPositionsSelectorsIDs,
  PredictPositionSelectorsIDs,
  PredictBuyPreviewSelectorsIDs,
  PredictCashOutSelectorsIDs,
  PredictOrderRetrySheetSelectorsIDs,
  PredictClaimConfirmationSelectorsIDs,
  PredictUnavailableSelectorsIDs,
  PredictActivityDetailsSelectorsIDs,
  PredictSearchSelectorsIDs,
  getPredictSearchSelector,
  PredictBalanceSelectorsIDs,
  PredictBalanceSelectorsText,
  PredictAddFundsSelectorText,
} from './Predict.testIds';

describe('Predict.testIds', () => {
  it('exposes stable tab and list selector ids', () => {
    expect(PredictTabViewSelectorsIDs.CONTAINER).toBe(
      'predict-tab-view-container',
    );
    expect(PredictMarketListSelectorsIDs.TRENDING_TAB).toBe(
      'predict-market-list-trending-tab',
    );
  });

  it('builds dynamic market list selectors', () => {
    expect(getPredictMarketListSelector.marketCardByCategory('crypto', 2)).toBe(
      'predict-market-list-crypto-card-2',
    );
    expect(getPredictMarketListSelector.marketCardBetYes('sports', 0)).toBe(
      'predict-market-list-sports-card-0-action-buttons-bet-yes',
    );
    expect(getPredictMarketListSelector.marketCardBetNo('sports', 0)).toBe(
      'predict-market-list-sports-card-0-action-buttons-bet-no',
    );
    expect(getPredictMarketListSelector.emptyState()).toBe(
      PredictMarketListSelectorsIDs.EMPTY_STATE,
    );
  });

  it('builds feed-related selectors', () => {
    expect(getPredictFeedSelector.tabPage('trending')).toBe(
      'predict-feed-tab-page-trending',
    );
    expect(getPredictFeedSelector.emptyState('crypto')).toBe(
      'predict-empty-state-crypto',
    );
    expect(getPredictFeedSelector.skeletonLoading('new', 1)).toBe(
      'skeleton-loading-new-1',
    );
    expect(getPredictFeedSelector.marketList('politics')).toBe(
      'predict-market-list-politics',
    );
    expect(getPredictFeedMockSelector.tabKey('x')).toBe('tab-x');
    expect(getPredictFeedMockSelector.pagerPage(3)).toBe('pager-page-3');
    expect(PredictFeedMockSelectorsIDs.PAGER_VIEW).toBe('pager-view-mock');
  });

  it('exposes market details and positions ids', () => {
    expect(getPredictMarketDetailsSelector.tabBarTab(2)).toBe(
      'predict-market-details-tab-bar-tab-2',
    );
    expect(getPredictMarketDetailsSelector.icon('close')).toBe('icon-close');
    expect(PredictMarketDetailsSelectorsText.ABOUT_TAB_TEXT).toBe('About');
    expect(PredictPositionsHeaderSelectorsIDs.CLAIM_BUTTON).toBe(
      'predict-claim-button',
    );
    expect(PredictPositionSelectorsIDs.CURRENT_POSITION_CARD).toBe(
      'predict-current-position-card',
    );
  });

  it('exposes search, balance, and add-funds strings', () => {
    expect(getPredictSearchSelector.resultCard(5)).toBe(
      'predict-search-result-5',
    );
    expect(PredictSearchSelectorsIDs.SEARCH_BUTTON).toBe(
      'predict-search-button',
    );
    expect(PredictBalanceSelectorsIDs.BALANCE_CARD).toBe(
      'predict-balance-card',
    );
    expect(PredictActivityDetailsSelectorsIDs.CONTAINER).toBe(
      'predict-activity-details-container',
    );
    expect(PredictBuyPreviewSelectorsIDs.PLACE_BET_BUTTON).toBe(
      'predict-buy-preview-place-bet-button',
    );
    expect(PredictCashOutSelectorsIDs.CONTAINER).toBe(
      'predict-cash-out-container',
    );
    expect(PredictOrderRetrySheetSelectorsIDs.RETRY_BUTTON).toBe(
      'predict-order-retry-sheet-retry-button',
    );
    expect(PredictBalanceSelectorsText.AVAILABLE_BALANCE).toBeTruthy();
    expect(PredictAddFundsSelectorText.ADD_FUNDS).toBeTruthy();
    expect(PredictUnavailableSelectorsIDs.TITLE_TEXT).toBeTruthy();
  });

  it('includes claim confirmation container placeholder in object', () => {
    expect(PredictClaimConfirmationSelectorsIDs.CLAIM_CONFIRM_BUTTON).toBe(
      'predict-claim-confirm-button',
    );
  });
});
