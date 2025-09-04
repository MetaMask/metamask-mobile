// ========================================
// PERPS CANDLESTICK CHART SELECTORS
// ========================================

export const PerpsCandlestickChartSelectorsIDs = {
  // Chart components
  PROVIDER: 'candlestick-provider',
  CONTAINER: 'candlestick-chart-container',
  CANDLES: 'candlestick-chart-candles',
  CROSSHAIR: 'candlestick-chart-crosshair',
  TOOLTIP: 'candlestick-chart-tooltip',
  LOADING_SKELETON: 'perps-chart-loading-skeleton',
  SKELETON: 'perps-chart-skeleton',

  // Chart states
  LOADING_STATE: 'chart-loading-state',
  DATA_STATE: 'chart-data-state',
  SELECTED_INTERVAL: 'chart-selected-interval',
  INTERVAL_CHANGE: 'chart-interval-change',

  // Duration selector states
  DURATION_SELECTOR: 'perps-chart-duration-selector',
  DURATION_SELECTOR_LOADING: 'perps-chart-duration-selector-loading',
  DURATION_SELECTOR_NO_DATA: 'perps-chart-duration-selector-no-data',

  // Interval selector states
  INTERVAL_SELECTOR: 'perps-chart-interval-selector',
  INTERVAL_SELECTOR_LOADING: 'perps-chart-interval-selector-loading',
  INTERVAL_SELECTOR_NO_DATA: 'perps-chart-interval-selector-no-data',
};

// Helper functions for dynamic selectors
export const getCandlestickChartSelector = {
  intervalButton: (baseTestID: string, interval: string) =>
    `${baseTestID}-${interval}`,
  chartDataPoint: (index: number) => `candlestick-chart-data-point-${index}`,
  chartCandle: (index: number) => `candlestick-chart-candle-${index}`,
  volumeBar: (index: number) => `candlestick-chart-volume-bar-${index}`,
};

// ========================================
// PERPS POSITION CARD SELECTORS
// ========================================

export const PerpsPositionCardSelectorsIDs = {
  CARD: 'PerpsPositionCard',
  // Test mock selectors (for component testing)
  COIN: 'position-card-coin',
  SIZE: 'position-card-size',
  PNL: 'position-card-pnl',
  CLOSE_BUTTON: 'position-card-close',
  EDIT_BUTTON: 'position-card-edit',
};

// ========================================
// PERPS LOADER SELECTORS
// ========================================

export const PerpsLoaderSelectorsIDs = {
  FULLSCREEN: 'perps-loader-fullscreen',
  INLINE: 'perps-loader-inline',
  SPINNER: 'perps-loader-spinner',
  TEXT: 'perps-loader-text',
};

// ========================================
// PERPS DEPOSIT PROCESSING VIEW SELECTORS
// ========================================

export const PerpsDepositProcessingViewSelectorsIDs = {
  HEADER_TITLE: 'header-title',
  CLOSE_BUTTON: 'close-button',
  STATUS_TITLE: 'status-title',
  STATUS_DESCRIPTION: 'status-description',
  PROCESSING_ANIMATION: 'processing-animation',
  SUCCESS_CHECKMARK: 'success-checkmark',
  PROCESSING_ICON: 'processing-icon',
  VIEW_BALANCE_BUTTON: 'view-balance-button',
  RETRY_BUTTON: 'retry-button',
  GO_BACK_BUTTON: 'go-back-button',
};

// ========================================
// PERPS PAY WITH ROW SELECTORS
// ========================================

export const PerpsPayWithRowSelectorsIDs = {
  MAIN: 'perps-pay-with-row',
  USD_EQUIVALENT: 'perps-pay-with-row-usd-equivalent',
};

// Helper functions for dynamic PerpsPayWithRow selectors
export const getPerpsPayWithRowSelector = {
  usdEquivalent: (baseTestID: string) => `${baseTestID}-usd-equivalent`,
};

// ========================================
// PERPS MARKET LIST VIEW SELECTORS
// ========================================

export const PerpsMarketListViewSelectorsIDs = {
  TUTORIAL_BUTTON: 'perps-market-list-tutorial-button',
  SEARCH_TOGGLE_BUTTON: 'perps-market-list-search-toggle-button',
  CLOSE_BUTTON: 'perps-market-list-close-button',
  BACK_HEADER_BUTTON: 'perps-market-header-back-button',
  BACK_LIST_BUTTON: 'perps-market-list-back-button',
  SEARCH_CLEAR_BUTTON: 'perps-market-list-search-clear-button',
  SKELETON_ROW: 'perps-market-list-skeleton-row',
  LIST_HEADER: 'perps-market-list-header',
};

// ========================================
// PERPS MARKET ROW ITEM SELECTORS
// ========================================

export const PerpsMarketRowItemSelectorsIDs = {
  ROW_ITEM: 'perps-market-row-item',
};

// Helper functions for dynamic market row selectors
export const getPerpsMarketRowItemSelector = {
  rowItem: (symbol: string) =>
    `${PerpsMarketRowItemSelectorsIDs.ROW_ITEM}-${symbol}`,
  tokenLogo: (symbol: string) =>
    `${PerpsMarketRowItemSelectorsIDs.ROW_ITEM}-${symbol}-token-logo`,
};

// ========================================
// PERPS ORDER HEADER SELECTORS
// ========================================

export const PerpsOrderHeaderSelectorsIDs = {
  HEADER: 'perps-order-header',
  ASSET_TITLE: 'perps-order-header-asset-title',
};

// ========================================
// PERPS TOKEN SELECTOR SELECTORS
// ========================================

export const PerpsTokenSelectorSelectorsIDs = {
  CONTAINER: 'token-selector',
  MODAL: 'perps-token-selector-modal',
  TITLE: 'token-selector-title',
  CLOSE_BUTTON: 'close-token-selector',
};

// ========================================
// PERPS AMOUNT DISPLAY SELECTORS
// ========================================

export const PerpsAmountDisplaySelectorsIDs = {
  CONTAINER: 'perps-amount-display',
  AMOUNT_LABEL: 'perps-amount-display-amount',
  MAX_LABEL: 'perps-amount-display-max',
};

// ========================================
// PERPS VIEWS SELECTORS
// ========================================

export const PerpsTabViewSelectorsIDs = {
  START_NEW_TRADE_CTA: 'perps-tab-view-start-new-trade-cta',
  GEO_BLOCK_BOTTOM_SHEET_TOOLTIP:
    'perps-tab-view-geo-block-bottom-sheet-tooltip',
  ONBOARDING_BUTTON: 'perps-start-trading-button',
  BALANCE_BUTTON: 'perps-balance-button',
  ADD_FUNDS_BUTTON: 'perps-add-funds-button',
  WITHDRAW_BUTTON: 'perps-withdraw-button',
  BALANCE_VALUE: 'perps-balance-value',
  SCROLL_VIEW: 'perps-tab-scroll-view',
};

export const PerpsPositionsViewSelectorsIDs = {
  REFRESH_CONTROL: 'refresh-control',
  BACK_BUTTON: 'button-icon-arrow-left',
  POSITION_ITEM: 'perps-positions-item',
  POSITIONS_SECTION: 'perps-positions-section',
  POSITIONS_SECTION_TITLE: 'perps-positions-section-title',
};

export const PerpsPositionDetailsViewSelectorsIDs = {
  CANDLESTICK_CHART: 'candlestick-chart',
  TRADINGVIEW_CHART: 'tradingview-chart',
  // Bottom sheets
  TPSL_BOTTOMSHEET: 'perps-tpsl-bottomsheet',
  CLOSE_POSITION_BOTTOMSHEET: 'perps-close-position-bottomsheet',
  CONFIRM_CLOSE_POSITION: 'confirm-close-position',
  CANDLE_PERIOD_BOTTOMSHEET: 'perps-candle-period-bottom-sheet',
  // Chart component mocks (for tests)
  CHART_PROVIDER: 'chart-provider',
  CHART_CANDLES: 'chart-candles',
  CHART_CROSSHAIR: 'chart-crosshair',
  CHART_TOOLTIP: 'chart-tooltip',
};

// ========================================
// PERPS TPSL BOTTOM SHEET SELECTORS
// ========================================

export const PerpsTPSLBottomSheetSelectorsIDs = {
  BOTTOM_SHEET: 'perps-tpsl-bottomsheet',
  SET_BUTTON: 'perps-tpsl-set-button',
} as const;

export const getPerpsTPSLBottomSheetSelector = {
  takeProfitPercentageButton: (percentage: number) =>
    `perps-tpsl-take-profit-percentage-button-${percentage}`,
  stopLossPercentageButton: (percentage: number) =>
    `perps-tpsl-stop-loss-percentage-button-${percentage}`,
};

// ========================================
// TRADINGVIEW CHART SELECTORS
// ========================================

export const TradingViewChartSelectorsIDs = {
  // Chart container and webview
  CONTAINER: 'tradingview-chart-container',
  WEBVIEW: 'tradingview-chart-webview',
  ERROR_CONTAINER: 'tradingview-chart-error',
  LOADING: 'tradingview-chart-loading',
};

// Helper functions for dynamic view selectors
export const getPerpsViewSelector = {
  buttonIcon: (iconName: string) => `button-icon-${iconName.toLowerCase()}`,
  chartDurationButton: (duration: string) =>
    `perps-chart-duration-selector-duration-${duration}`,
};

// Helper functions for PerpsTimeDurationSelector dynamic selectors
export const getPerpsTimeDurationSelector = {
  durationButton: (baseTestID: string, duration: string) =>
    `${baseTestID}-duration-${duration}`,
  gearButton: (baseTestID: string) => `${baseTestID}-gear-button`,
};

// Helper functions for PerpsCandlePeriodBottomSheet dynamic selectors
export const getPerpsCandlePeriodBottomSheetSelector = {
  periodButton: (baseTestID: string, period: string) =>
    `${baseTestID}-period-${period}`,
};

// Helper functions for PerpsCandlePeriodSelector dynamic selectors
export const getPerpsCandlePeriodSelector = {
  periodButton: (baseTestID: string, period: string) =>
    `${baseTestID}-period-${period}`,
  moreButton: (baseTestID: string) => `${baseTestID}-more-button`,
};

// ========================================
// PERPS WITHDRAW VIEW SELECTORS
// ========================================

export const PerpsWithdrawViewSelectorsIDs = {
  BACK_BUTTON: 'withdraw-back-button',
  SOURCE_TOKEN_AREA: 'source-token-area',
  DEST_TOKEN_AREA: 'dest-token-area',
  CONTINUE_BUTTON: 'continue-button',
  BOTTOM_SHEET_TOOLTIP: 'withdraw-bottom-sheet-tooltip',
};

// ========================================
// PERPS MARKET DETAILS VIEW SELECTORS
// ========================================

export const PerpsMarketDetailsViewSelectorsIDs = {
  CONTAINER: 'perps-market-details-view',
  SCROLL_VIEW: 'perps-market-details-scroll-view',
  LOADING: 'perps-market-details-loading',
  ERROR: 'perps-market-details-error',
  HEADER: 'perps-market-header',
  STATISTICS_HIGH_24H: 'perps-statistics-high-24h',
  STATISTICS_LOW_24H: 'perps-statistics-low-24h',
  STATISTICS_VOLUME_24H: 'perps-statistics-volume-24h',
  STATISTICS_OPEN_INTEREST: 'perps-statistics-open-interest',
  STATISTICS_FUNDING_RATE: 'perps-statistics-funding-rate',
  STATISTICS_FUNDING_COUNTDOWN: 'perps-statistics-funding-countdown',
  ADD_FUNDS_BUTTON: 'perps-market-details-add-funds-button',
  LONG_BUTTON: 'perps-market-details-long-button',
  SHORT_BUTTON: 'perps-market-details-short-button',
  CANDLE_PERIOD_BOTTOM_SHEET: 'perps-market-candle-period-bottom-sheet',
  OPEN_INTEREST_INFO_ICON: 'perps-market-details-open-interest-info-icon',
  FUNDING_RATE_INFO_ICON: 'perps-market-details-funding-rate-info-icon',
  BOTTOM_SHEET_TOOLTIP: 'perps-market-details-bottom-sheet-tooltip',
  GEO_BLOCK_BOTTOM_SHEET_TOOLTIP:
    'perps-market-details-geo-block-bottom-sheet-tooltip',
};

// ========================================
// PERPS MARKET HEADER SELECTORS
// ========================================

export const PerpsMarketHeaderSelectorsIDs = {
  CONTAINER: 'perps-market-header',
  BACK_BUTTON: 'perps-market-header-back-button',
  ASSET_ICON: 'perps-market-header-asset-icon',
  ASSET_NAME: 'perps-market-header-asset-name',
  PRICE: 'perps-market-header-price',
  PRICE_CHANGE: 'perps-market-header-price-change',
  MORE_BUTTON: 'perps-market-header-more-button',
};

// ========================================
// PERPS TESTNET TOGGLE SELECTORS
// ========================================

export const PerpsTestnetToggleSelectorsIDs = {
  ROOT: 'perps-testnet-toggle-root',
  SWITCH: 'perps-testnet-toggle-switch',
  LOADING_INDICATOR: 'perps-testnet-toggle-loading-indicator',
};

// ========================================
// PERPS DEVELOPER OPTIONS SECTION SELECTORS
// ========================================

export const PerpsDeveloperOptionsSectionSelectorsIDs = {
  PERPS_SANDBOX_BUTTON: 'perps-developer-options-section-perps-sandbox-button',
};

// ========================================
// PERPS TRANSACTION SELECTORS
// ========================================

export const PerpsTransactionSelectorsIDs = {
  // Transaction Detail Asset Hero
  TRANSACTION_DETAIL_ASSET_HERO: 'perps-transaction-detail-asset-hero',
  ASSET_ICON_CONTAINER: 'asset-icon-container',

  // Transaction Item
  TRANSACTION_ITEM: 'transaction-item',
  TRANSACTION_ITEM_AVATAR: 'transaction-item-avatar',

  // Transaction Views
  FUNDING_TRANSACTION_VIEW: 'perps-funding-transaction-view',
  ORDER_TRANSACTION_VIEW: 'perps-order-transaction-view',

  // Common buttons
  BLOCK_EXPLORER_BUTTON: 'block-explorer-button',
};

export const PerpsChartGridLinesSelectorsIDs = {
  // Chart grid lines container
  CHART_GRID_LINES: 'chart-grid-lines',
  // Dynamic grid line selectors (use with index)
  GRID_LINE: 'grid-line', // Use as `grid-line-${index}`
  GRID_LINE_BAR: 'grid-line-bar', // Use as `grid-line-bar-${index}`
  GRID_PRICE_LABEL: 'grid-price-label', // Use as `grid-price-label-${index}`
};

export const PerpsChartAuxiliaryLinesSelectorsIDs = {
  // Auxiliary lines container (TP/SL lines)
  AUXILIARY_LINES: 'auxiliary-lines',
};

export const PerpsChartAdditionalSelectorsIDs = {
  // Chart axis and components
  CANDLESTICK_X_AXIS: 'chart-x-axis',
  CHART_GRID: 'chart-grid',
  CANDLESTICK_AUXILIARY_LINES: 'candlestick-auxiliary-lines',
};
// ========================================
// PERPS BOTTOM SHEET TOOLTIP SELECTORS
// ========================================

export const PerpsBottomSheetTooltipSelectorsIDs = {
  TOOLTIP: 'perps-bottom-sheet-tooltip',
  TITLE: 'perps-bottom-sheet-tooltip-title',
  CONTENT: 'perps-bottom-sheet-tooltip-content',
  GOT_IT_BUTTON: 'perps-bottom-sheet-tooltip-got-it-button',
};

// ========================================
// PERPS TUTORIAL SELECTORS
// ========================================

export const PerpsTutorialSelectorsIDs = {
  CONTINUE_BUTTON: 'perps-tutorial-continue-button',
  SKIP_BUTTON: 'perps-tutorial-skip-button',
  CAROUSEL: 'perps-tutorial-carousel',
  CARD: 'perps-tutorial-card',
} as const;

// ========================================
// PERPS GTM MODAL SELECTORS
// ========================================

export const PerpsGTMModalSelectorsIDs = {
  PERPS_GTM_MODAL: 'perps-gtm-modal',
  PERPS_LEARN_MORE_BUTTON: 'perps-learn-more-button',
  PERPS_TRY_NOW_BUTTON: 'perps-try-now-button',
  PERPS_NOT_NOW_BUTTON: 'perps-not-now-button',
};

// ========================================
// PERPS ORDER VIEW SELECTORS
// ========================================

export const PerpsOrderViewSelectorsIDs = {
  BOTTOM_SHEET_TOOLTIP: 'perps-order-view-bottom-sheet-tooltip',
  NOTIFICATION_TOOLTIP: 'perps-order-view-notification-tooltip',
  LEVERAGE_INFO_ICON: 'perps-order-view-leverage-info-icon',
  MARGIN_INFO_ICON: 'perps-order-view-margin-info-icon',
  LIQUIDATION_PRICE_INFO_ICON: 'perps-order-view-liquidation-price-info-icon',
  FEES_INFO_ICON: 'perps-order-view-fees-info-icon',
  TP_SL_INFO_ICON: 'perps-order-view-tp-sl-info-icon',
  // Buttons present in PerpsOrderView (TouchableOpacity with testID)
  TAKE_PROFIT_BUTTON: 'perps-order-view-take-profit-button',
  STOP_LOSS_BUTTON: 'perps-order-view-stop-loss-button',
  PLACE_ORDER_BUTTON: 'perps-order-view-place-order-button',
  KEYPAD: 'perps-order-view-keypad',
};

// ========================================
// PERPS OPEN ORDER CARD SELECTORS
// ========================================

export const PerpsOpenOrderCardSelectorsIDs = {
  CARD: 'perps-open-order-card',
  CANCEL_BUTTON: 'perps-open-order-card-cancel-button',
  EDIT_BUTTON: 'perps-open-order-card-edit-button',
};

// ========================================
// PERPS CLOSE POSITION VIEW SELECTORS
// ========================================

export const PerpsClosePositionViewSelectorsIDs = {
  ORDER_TYPE_BUTTON: 'order-type-button',
  DISPLAY_TOGGLE_BUTTON: 'display-toggle-button',
  CLOSE_POSITION_CONFIRM_BUTTON: 'close-position-confirm-button',
  CLOSE_POSITION_CANCEL_BUTTON: 'close-position-cancel-button',
};

// ========================================
// PERPS MARKET TABS SELECTORS
// ========================================

export const PerpsMarketTabsSelectorsIDs = {
  // Container
  CONTAINER: 'perps-market-tabs-container',

  // Tab bar and tabs
  TAB_BAR: 'perps-market-tabs-tab-bar',
  POSITION_TAB: 'perps-market-tabs-position-tab',
  ORDERS_TAB: 'perps-market-tabs-orders-tab',
  STATISTICS_TAB: 'perps-market-tabs-statistics-tab',

  // Tab content areas
  TAB_CONTENT: 'perps-market-tabs-tab-content',
  POSITION_CONTENT: 'perps-market-tabs-position-content',
  ORDERS_CONTENT: 'perps-market-tabs-orders-content',
  STATISTICS_CONTENT: 'perps-market-tabs-statistics-content',

  // Empty states
  ORDERS_EMPTY_STATE: 'perps-market-tabs-orders-empty-state',
  ORDERS_EMPTY_ICON: 'perps-market-tabs-orders-empty-icon',
  ORDERS_EMPTY_TEXT: 'perps-market-tabs-orders-empty-text',

  // Statistics-only view
  STATISTICS_ONLY_TITLE: 'perps-market-tabs-statistics-only-title',

  // Loading states
  SKELETON_TAB_BAR: 'perps-market-tabs-skeleton-tab-bar',
  SKELETON_CONTENT: 'perps-market-tabs-skeleton-content',
};

// ========================================
// PERPS GENERAL (CROSS-COMPONENT) SELECTORS
// ========================================

export const PerpsGeneralSelectorsIDs = {
  // TPSL bottom sheet primary action button ("Set" / "Updating")
  BOTTOM_SHEET_FOOTER_BUTTON: 'perps-tpsl-set-button',
  // Order success toast dismiss button on PerpsOrderView
  ORDER_SUCCESS_TOAST_DISMISS_BUTTON:
    'perps-order-success-toast-dismiss-button',
  // Common action buttons that may appear in flows (keep for E2E compatibility)
  CONTINUE_BUTTON: 'continue-button',
  DONE_BUTTON: 'done-button',
} as const;
