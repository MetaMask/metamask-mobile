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

  // Chart states
  LOADING_STATE: 'chart-loading-state',
  DATA_STATE: 'chart-data-state',
  SELECTED_INTERVAL: 'chart-selected-interval',
  INTERVAL_CHANGE: 'chart-interval-change',

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
};

// Helper functions for dynamic view selectors
export const getPerpsViewSelector = {
  buttonIcon: (iconName: string) => `button-icon-${iconName.toLowerCase()}`,
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
