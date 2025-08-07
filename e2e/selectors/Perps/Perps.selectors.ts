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
// PERPS POSITION HEADER SELECTORS
// ========================================

export const PerpsPositionHeaderSelectorsIDs = {
  HEADER: 'position-header',
  COIN: 'position-header-coin',
  PNL: 'position-header-pnl',
  BACK_BUTTON: 'perps-position-header-back-button',
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
  SEARCH_TOGGLE_BUTTON: 'search-toggle-button',
  CLOSE_BUTTON: 'close-button',
  SEARCH_CLEAR_BUTTON: 'search-clear-button',
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
};

// ========================================
// PERPS VIEWS SELECTORS
// ========================================

export const PerpsPositionsViewSelectorsIDs = {
  REFRESH_CONTROL: 'refresh-control',
  BACK_BUTTON: 'button-icon-arrow-left',
};

export const PerpsPositionDetailsViewSelectorsIDs = {
  CANDLESTICK_CHART: 'candlestick-chart',
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

// ========================================
// PERPS WITHDRAW VIEW SELECTORS
// ========================================

export const PerpsWithdrawViewSelectorsIDs = {
  BACK_BUTTON: 'withdraw-back-button',
  SOURCE_TOKEN_AREA: 'source-token-area',
  DEST_TOKEN_AREA: 'dest-token-area',
  CONTINUE_BUTTON: 'continue-button',
};

// ========================================
// PERPS MARKET DETAILS VIEW SELECTORS
// ========================================

export const PerpsMarketDetailsViewSelectorsIDs = {
  CONTAINER: 'perps-market-details-view',
  LOADING: 'perps-market-details-loading',
  ERROR: 'perps-market-details-error',
  HEADER: 'perps-market-header',
  STATISTICS_HIGH_24H: 'perps-statistics-high-24h',
  STATISTICS_LOW_24H: 'perps-statistics-low-24h',
  STATISTICS_VOLUME_24H: 'perps-statistics-volume-24h',
  STATISTICS_OPEN_INTEREST: 'perps-statistics-open-interest',
  STATISTICS_FUNDING_RATE: 'perps-statistics-funding-rate',
  STATISTICS_FUNDING_COUNTDOWN: 'perps-statistics-funding-countdown',
  LONG_BUTTON: 'perps-long-button',
  SHORT_BUTTON: 'perps-short-button',
  CANDLE_PERIOD_BOTTOM_SHEET: 'perps-market-candle-period-bottom-sheet',
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
