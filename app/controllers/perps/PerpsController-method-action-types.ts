import type { PerpsController } from './PerpsController';

export type PerpsControllerPlaceOrderAction = {
  type: 'PerpsController:placeOrder';
  handler: PerpsController['placeOrder'];
};

export type PerpsControllerEditOrderAction = {
  type: 'PerpsController:editOrder';
  handler: PerpsController['editOrder'];
};

export type PerpsControllerCancelOrderAction = {
  type: 'PerpsController:cancelOrder';
  handler: PerpsController['cancelOrder'];
};

export type PerpsControllerCancelOrdersAction = {
  type: 'PerpsController:cancelOrders';
  handler: PerpsController['cancelOrders'];
};

export type PerpsControllerClosePositionAction = {
  type: 'PerpsController:closePosition';
  handler: PerpsController['closePosition'];
};

export type PerpsControllerClosePositionsAction = {
  type: 'PerpsController:closePositions';
  handler: PerpsController['closePositions'];
};

export type PerpsControllerWithdrawAction = {
  type: 'PerpsController:withdraw';
  handler: PerpsController['withdraw'];
};

export type PerpsControllerGetPositionsAction = {
  type: 'PerpsController:getPositions';
  handler: PerpsController['getPositions'];
};

export type PerpsControllerGetOrderFillsAction = {
  type: 'PerpsController:getOrderFills';
  handler: PerpsController['getOrderFills'];
};

export type PerpsControllerGetOrdersAction = {
  type: 'PerpsController:getOrders';
  handler: PerpsController['getOrders'];
};

export type PerpsControllerGetOpenOrdersAction = {
  type: 'PerpsController:getOpenOrders';
  handler: PerpsController['getOpenOrders'];
};

export type PerpsControllerGetFundingAction = {
  type: 'PerpsController:getFunding';
  handler: PerpsController['getFunding'];
};

export type PerpsControllerGetAccountStateAction = {
  type: 'PerpsController:getAccountState';
  handler: PerpsController['getAccountState'];
};

export type PerpsControllerGetMarketsAction = {
  type: 'PerpsController:getMarkets';
  handler: PerpsController['getMarkets'];
};

export type PerpsControllerRefreshEligibilityAction = {
  type: 'PerpsController:refreshEligibility';
  handler: PerpsController['refreshEligibility'];
};

export type PerpsControllerToggleTestnetAction = {
  type: 'PerpsController:toggleTestnet';
  handler: PerpsController['toggleTestnet'];
};

export type PerpsControllerDisconnectAction = {
  type: 'PerpsController:disconnect';
  handler: PerpsController['disconnect'];
};

export type PerpsControllerCalculateFeesAction = {
  type: 'PerpsController:calculateFees';
  handler: PerpsController['calculateFees'];
};

export type PerpsControllerMarkTutorialCompletedAction = {
  type: 'PerpsController:markTutorialCompleted';
  handler: PerpsController['markTutorialCompleted'];
};

export type PerpsControllerMarkFirstOrderCompletedAction = {
  type: 'PerpsController:markFirstOrderCompleted';
  handler: PerpsController['markFirstOrderCompleted'];
};

export type PerpsControllerGetHistoricalPortfolioAction = {
  type: 'PerpsController:getHistoricalPortfolio';
  handler: PerpsController['getHistoricalPortfolio'];
};

export type PerpsControllerResetFirstTimeUserStateAction = {
  type: 'PerpsController:resetFirstTimeUserState';
  handler: PerpsController['resetFirstTimeUserState'];
};

export type PerpsControllerClearPendingTransactionRequestsAction = {
  type: 'PerpsController:clearPendingTransactionRequests';
  handler: PerpsController['clearPendingTransactionRequests'];
};

export type PerpsControllerSaveTradeConfigurationAction = {
  type: 'PerpsController:saveTradeConfiguration';
  handler: PerpsController['saveTradeConfiguration'];
};

export type PerpsControllerGetTradeConfigurationAction = {
  type: 'PerpsController:getTradeConfiguration';
  handler: PerpsController['getTradeConfiguration'];
};

export type PerpsControllerSaveMarketFilterPreferencesAction = {
  type: 'PerpsController:saveMarketFilterPreferences';
  handler: PerpsController['saveMarketFilterPreferences'];
};

export type PerpsControllerGetMarketFilterPreferencesAction = {
  type: 'PerpsController:getMarketFilterPreferences';
  handler: PerpsController['getMarketFilterPreferences'];
};

export type PerpsControllerSavePendingTradeConfigurationAction = {
  type: 'PerpsController:savePendingTradeConfiguration';
  handler: PerpsController['savePendingTradeConfiguration'];
};

export type PerpsControllerGetPendingTradeConfigurationAction = {
  type: 'PerpsController:getPendingTradeConfiguration';
  handler: PerpsController['getPendingTradeConfiguration'];
};

export type PerpsControllerClearPendingTradeConfigurationAction = {
  type: 'PerpsController:clearPendingTradeConfiguration';
  handler: PerpsController['clearPendingTradeConfiguration'];
};

export type PerpsControllerGetOrderBookGroupingAction = {
  type: 'PerpsController:getOrderBookGrouping';
  handler: PerpsController['getOrderBookGrouping'];
};

export type PerpsControllerSaveOrderBookGroupingAction = {
  type: 'PerpsController:saveOrderBookGrouping';
  handler: PerpsController['saveOrderBookGrouping'];
};

export type PerpsControllerSetSelectedPaymentTokenAction = {
  type: 'PerpsController:setSelectedPaymentToken';
  handler: PerpsController['setSelectedPaymentToken'];
};

export type PerpsControllerResetSelectedPaymentTokenAction = {
  type: 'PerpsController:resetSelectedPaymentToken';
  handler: PerpsController['resetSelectedPaymentToken'];
};

export type PerpsControllerMethodActions =
  | PerpsControllerPlaceOrderAction
  | PerpsControllerEditOrderAction
  | PerpsControllerCancelOrderAction
  | PerpsControllerCancelOrdersAction
  | PerpsControllerClosePositionAction
  | PerpsControllerClosePositionsAction
  | PerpsControllerWithdrawAction
  | PerpsControllerGetPositionsAction
  | PerpsControllerGetOrderFillsAction
  | PerpsControllerGetOrdersAction
  | PerpsControllerGetOpenOrdersAction
  | PerpsControllerGetFundingAction
  | PerpsControllerGetAccountStateAction
  | PerpsControllerGetMarketsAction
  | PerpsControllerRefreshEligibilityAction
  | PerpsControllerToggleTestnetAction
  | PerpsControllerDisconnectAction
  | PerpsControllerCalculateFeesAction
  | PerpsControllerMarkTutorialCompletedAction
  | PerpsControllerMarkFirstOrderCompletedAction
  | PerpsControllerGetHistoricalPortfolioAction
  | PerpsControllerResetFirstTimeUserStateAction
  | PerpsControllerClearPendingTransactionRequestsAction
  | PerpsControllerSaveTradeConfigurationAction
  | PerpsControllerGetTradeConfigurationAction
  | PerpsControllerSaveMarketFilterPreferencesAction
  | PerpsControllerGetMarketFilterPreferencesAction
  | PerpsControllerSavePendingTradeConfigurationAction
  | PerpsControllerGetPendingTradeConfigurationAction
  | PerpsControllerClearPendingTradeConfigurationAction
  | PerpsControllerGetOrderBookGroupingAction
  | PerpsControllerSaveOrderBookGroupingAction
  | PerpsControllerSetSelectedPaymentTokenAction
  | PerpsControllerResetSelectedPaymentTokenAction;
