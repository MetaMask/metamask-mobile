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
