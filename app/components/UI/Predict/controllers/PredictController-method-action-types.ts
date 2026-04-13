/**
 * This file is auto generated.
 * Do not edit manually.
 */

import type { PredictController } from './PredictController';

export type PredictControllerGetMarketsAction = {
  type: `PredictController:getMarkets`;
  handler: PredictController['getMarkets'];
};

/**
 * Get detailed information for a single market
 */
export type PredictControllerGetMarketAction = {
  type: `PredictController:getMarket`;
  handler: PredictController['getMarket'];
};

export type PredictControllerGetMarketSeriesAction = {
  type: `PredictController:getMarketSeries`;
  handler: PredictController['getMarketSeries'];
};

export type PredictControllerGetPriceHistoryAction = {
  type: `PredictController:getPriceHistory`;
  handler: PredictController['getPriceHistory'];
};

export type PredictControllerGetPricesAction = {
  type: `PredictController:getPrices`;
  handler: PredictController['getPrices'];
};

export type PredictControllerGetPositionsAction = {
  type: `PredictController:getPositions`;
  handler: PredictController['getPositions'];
};

export type PredictControllerGetActivityAction = {
  type: `PredictController:getActivity`;
  handler: PredictController['getActivity'];
};

export type PredictControllerGetUnrealizedPnLAction = {
  type: `PredictController:getUnrealizedPnL`;
  handler: PredictController['getUnrealizedPnL'];
};

/**
 * Track Predict trade transaction analytics event
 * Uses a single consolidated event with status discriminator
 *
 * @public
 */
export type PredictControllerTrackPredictOrderEventAction = {
  type: `PredictController:trackPredictOrderEvent`;
  handler: PredictController['trackPredictOrderEvent'];
};

export type PredictControllerTrackMarketDetailsOpenedAction = {
  type: `PredictController:trackMarketDetailsOpened`;
  handler: PredictController['trackMarketDetailsOpened'];
};

export type PredictControllerTrackPositionViewedAction = {
  type: `PredictController:trackPositionViewed`;
  handler: PredictController['trackPositionViewed'];
};

export type PredictControllerTrackActivityViewedAction = {
  type: `PredictController:trackActivityViewed`;
  handler: PredictController['trackActivityViewed'];
};

export type PredictControllerTrackGeoBlockTriggeredAction = {
  type: `PredictController:trackGeoBlockTriggered`;
  handler: PredictController['trackGeoBlockTriggered'];
};

export type PredictControllerTrackFeedViewedAction = {
  type: `PredictController:trackFeedViewed`;
  handler: PredictController['trackFeedViewed'];
};

export type PredictControllerTrackShareActionAction = {
  type: `PredictController:trackShareAction`;
  handler: PredictController['trackShareAction'];
};

export type PredictControllerPreviewOrderAction = {
  type: `PredictController:previewOrder`;
  handler: PredictController['previewOrder'];
};

export type PredictControllerPlaceOrderAction = {
  type: `PredictController:placeOrder`;
  handler: PredictController['placeOrder'];
};

export type PredictControllerClaimWithConfirmationAction = {
  type: `PredictController:claimWithConfirmation`;
  handler: PredictController['claimWithConfirmation'];
};

export type PredictControllerConfirmClaimAction = {
  type: `PredictController:confirmClaim`;
  handler: PredictController['confirmClaim'];
};

/**
 * Refresh eligibility status
 */
export type PredictControllerRefreshEligibilityAction = {
  type: `PredictController:refreshEligibility`;
  handler: PredictController['refreshEligibility'];
};

/**
 * Subscribes to real-time game updates via WebSocket.
 *
 * @param gameId - Unique identifier of the game to subscribe to
 * @param callback - Function invoked when game state changes (score, period, status)
 * @returns Unsubscribe function to clean up the subscription
 */
export type PredictControllerSubscribeToGameUpdatesAction = {
  type: `PredictController:subscribeToGameUpdates`;
  handler: PredictController['subscribeToGameUpdates'];
};

/**
 * Subscribes to real-time market price updates via WebSocket.
 *
 * @param tokenIds - Array of token IDs to subscribe to price updates for
 * @param callback - Function invoked when prices change (includes bestBid/bestAsk)
 * @returns Unsubscribe function to clean up the subscription
 */
export type PredictControllerSubscribeToMarketPricesAction = {
  type: `PredictController:subscribeToMarketPrices`;
  handler: PredictController['subscribeToMarketPrices'];
};

/**
 * Subscribes to real-time crypto price updates via RTDS WebSocket.
 *
 * @param symbols - Array of crypto symbols to subscribe to (e.g., ['btcusdt'])
 * @param callback - Function invoked when a crypto price update is received
 * @returns Unsubscribe function to clean up the subscription
 */
export type PredictControllerSubscribeToCryptoPricesAction = {
  type: `PredictController:subscribeToCryptoPrices`;
  handler: PredictController['subscribeToCryptoPrices'];
};

/**
 * Gets the current WebSocket connection status for live data feeds.
 *
 * @returns Connection status for sports, market, and RTDS data WebSocket channels
 */
export type PredictControllerGetConnectionStatusAction = {
  type: `PredictController:getConnectionStatus`;
  handler: PredictController['getConnectionStatus'];
};

export type PredictControllerClearOrderErrorAction = {
  type: `PredictController:clearOrderError`;
  handler: PredictController['clearOrderError'];
};

export type PredictControllerOnPlaceOrderSuccessAction = {
  type: `PredictController:onPlaceOrderSuccess`;
  handler: PredictController['onPlaceOrderSuccess'];
};

export type PredictControllerClearActiveOrderTransactionIdAction = {
  type: `PredictController:clearActiveOrderTransactionId`;
  handler: PredictController['clearActiveOrderTransactionId'];
};

export type PredictControllerSelectPaymentTokenAction = {
  type: `PredictController:selectPaymentToken`;
  handler: PredictController['selectPaymentToken'];
};

export type PredictControllerClearActiveOrderAction = {
  type: `PredictController:clearActiveOrder`;
  handler: PredictController['clearActiveOrder'];
};

export type PredictControllerSetSelectedPaymentTokenAction = {
  type: `PredictController:setSelectedPaymentToken`;
  handler: PredictController['setSelectedPaymentToken'];
};

export type PredictControllerDepositWithConfirmationAction = {
  type: `PredictController:depositWithConfirmation`;
  handler: PredictController['depositWithConfirmation'];
};

/**
 * Prepares and submits a deposit transaction batch using the
 * `predictDepositAndOrder` transaction type. This triggers the new
 * deposit-and-order confirmation screen instead of the standard deposit screen.
 *
 * The flow reuses `provider.prepareDeposit` but overrides the transaction
 * type so the confirmation routing in `info-root.tsx` renders
 * `PredictPayWithAnyTokenInfo`.
 *
 */
export type PredictControllerInitPayWithAnyTokenAction = {
  type: `PredictController:initPayWithAnyToken`;
  handler: PredictController['initPayWithAnyToken'];
};

export type PredictControllerClearPendingDepositAction = {
  type: `PredictController:clearPendingDeposit`;
  handler: PredictController['clearPendingDeposit'];
};

export type PredictControllerGetAccountStateAction = {
  type: `PredictController:getAccountState`;
  handler: PredictController['getAccountState'];
};

export type PredictControllerGetBalanceAction = {
  type: `PredictController:getBalance`;
  handler: PredictController['getBalance'];
};

export type PredictControllerPrepareWithdrawAction = {
  type: `PredictController:prepareWithdraw`;
  handler: PredictController['prepareWithdraw'];
};

export type PredictControllerBeforeSignAction = {
  type: `PredictController:beforeSign`;
  handler: PredictController['beforeSign'];
};

export type PredictControllerClearWithdrawTransactionAction = {
  type: `PredictController:clearWithdrawTransaction`;
  handler: PredictController['clearWithdrawTransaction'];
};

/**
 * Union of all PredictController action types.
 */
export type PredictControllerMethodActions =
  | PredictControllerGetMarketsAction
  | PredictControllerGetMarketAction
  | PredictControllerGetMarketSeriesAction
  | PredictControllerGetPriceHistoryAction
  | PredictControllerGetPricesAction
  | PredictControllerGetPositionsAction
  | PredictControllerGetActivityAction
  | PredictControllerGetUnrealizedPnLAction
  | PredictControllerTrackPredictOrderEventAction
  | PredictControllerTrackMarketDetailsOpenedAction
  | PredictControllerTrackPositionViewedAction
  | PredictControllerTrackActivityViewedAction
  | PredictControllerTrackGeoBlockTriggeredAction
  | PredictControllerTrackFeedViewedAction
  | PredictControllerTrackShareActionAction
  | PredictControllerPreviewOrderAction
  | PredictControllerPlaceOrderAction
  | PredictControllerClaimWithConfirmationAction
  | PredictControllerConfirmClaimAction
  | PredictControllerRefreshEligibilityAction
  | PredictControllerSubscribeToGameUpdatesAction
  | PredictControllerSubscribeToMarketPricesAction
  | PredictControllerSubscribeToCryptoPricesAction
  | PredictControllerGetConnectionStatusAction
  | PredictControllerClearOrderErrorAction
  | PredictControllerOnPlaceOrderSuccessAction
  | PredictControllerClearActiveOrderTransactionIdAction
  | PredictControllerSelectPaymentTokenAction
  | PredictControllerClearActiveOrderAction
  | PredictControllerSetSelectedPaymentTokenAction
  | PredictControllerDepositWithConfirmationAction
  | PredictControllerInitPayWithAnyTokenAction
  | PredictControllerClearPendingDepositAction
  | PredictControllerGetAccountStateAction
  | PredictControllerGetBalanceAction
  | PredictControllerPrepareWithdrawAction
  | PredictControllerBeforeSignAction
  | PredictControllerClearWithdrawTransactionAction;
