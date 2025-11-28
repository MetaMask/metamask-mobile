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
// PERPS OHLCV BAR SELECTORS
// ========================================

export const PerpsOHLCVBarSelectorsIDs = {
  CONTAINER: 'perps-ohlcv-bar',
  VALUES_ROW: 'perps-ohlcv-bar-values-row',
  LABELS_ROW: 'perps-ohlcv-bar-labels-row',
};

// ========================================
// PERPS CHART FULLSCREEN MODAL SELECTORS
// ========================================

export const PerpsChartFullscreenModalSelectorsIDs = {
  MODAL: 'modal-container',
  CONTAINER: 'perps-chart-fullscreen-container',
  HEADER: 'perps-chart-fullscreen-header',
  CLOSE_BUTTON: 'perps-chart-fullscreen-close-button',
  CHART: 'fullscreen-chart',
  INTERVAL_SELECTOR: 'perps-chart-fullscreen-interval-selector',
  OHLCV_BAR: 'fullscreen-chart-ohlcv-bar',
} as const;

// ========================================
// PERPS POSITION CARD SELECTORS
// ========================================

export const PerpsPositionCardSelectorsIDs = {
  CARD: 'PerpsPositionCard',
  HEADER: 'position-card-header',
  SHARE_BUTTON: 'position-card-share',
  PNL_CARD: 'position-card-pnl',
  PNL_VALUE: 'position-card-pnl-value',
  RETURN_CARD: 'position-card-return',
  RETURN_VALUE: 'position-card-return-value',
  SIZE_CONTAINER: 'position-card-size',
  SIZE_VALUE: 'position-card-size-value',
  FLIP_ICON: 'position-card-flip-icon',
  MARGIN_CONTAINER: 'position-card-margin',
  MARGIN_VALUE: 'position-card-margin-value',
  MARGIN_CHEVRON: 'position-card-margin-chevron',
  AUTO_CLOSE_TOGGLE: 'position-card-auto-close-toggle',
  DETAILS_SECTION: 'position-card-details',
  DIRECTION_VALUE: 'position-card-direction-value',
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
  SEARCH_TOGGLE_BUTTON: 'perps-market-list-search-toggle-button',
  CLOSE_BUTTON: 'perps-market-list-close-button',
  BACK_HEADER_BUTTON: 'perps-market-header-back-button',
  BACK_LIST_BUTTON: 'perps-market-list-back-button',
  BACK_BUTTON: 'perps-market-list-back-button',
  SEARCH_CLEAR_BUTTON: 'perps-market-list-search-bar-clear',
  SEARCH_BAR: 'perps-market-list-search-bar',
  SKELETON_ROW: 'perps-market-list-skeleton-row',
  LIST_HEADER: 'perps-market-list-header',
  MARKET_LIST: 'perps-market-list',
  SORT_FILTERS: 'perps-market-list-sort-filters',
  WATCHLIST_TOGGLE: 'perps-market-list-watchlist-toggle',
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
  badge: (symbol: string) =>
    `${PerpsMarketRowItemSelectorsIDs.ROW_ITEM}-${symbol}-badge`,
};

// ========================================
// PERPS ORDER HEADER SELECTORS
// ========================================

export const PerpsOrderHeaderSelectorsIDs = {
  HEADER: 'perps-order-header',
  ASSET_TITLE: 'perps-order-header-asset-title',
  ORDER_TYPE_BUTTON: 'perps-order-header-order-type-button',
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

export const PerpsHomeViewSelectorsIDs = {
  SUPPORT_BUTTON: 'perps-home-support-button',
  LEARN_MORE_BUTTON: 'perps-home-learn-more-button',
  BACK_BUTTON: 'back-button',
  SEARCH_TOGGLE: 'perps-home-search-toggle',
  SEARCH_INPUT: 'perps-home-search',
  SCROLL_CONTENT: 'scroll-content',
  WITHDRAW_BUTTON: 'perps-home-withdraw-button',
  ADD_FUNDS_BUTTON: 'perps-home-add-funds-button',
  // TabBar mock items (for testing)
  TAB_BAR_WALLET: 'tab-bar-item-wallet',
  TAB_BAR_BROWSER: 'tab-bar-item-browser',
  TAB_BAR_ACTIONS: 'tab-bar-item-actions',
  TAB_BAR_ACTIVITY: 'tab-bar-item-activity',
};

export const PerpsPositionsViewSelectorsIDs = {
  REFRESH_CONTROL: 'refresh-control',
  BACK_BUTTON: 'back-button',
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
// PERPS TPSL VIEW SELECTORS
// ========================================

export const PerpsTPSLViewSelectorsIDs = {
  BACK_BUTTON: 'back-button',
  BOTTOM_SHEET: 'perps-tpsl-bottomsheet',
  SET_BUTTON: 'bottomsheetfooter-button',
} as const;

export const getPerpsTPSLViewSelector = {
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
  CLOSE_BUTTON: 'perps-market-details-close-button',
  MODIFY_BUTTON: 'perps-market-details-modify-button',
  SHARE_BUTTON: 'perps-market-details-share-button',
  ADD_TPSL_BUTTON: 'perps-market-details-add-tpsl-button',
  MODIFY_ACTION_SHEET: 'perps-market-details-modify-action-sheet',
  ADJUST_MARGIN_ACTION_SHEET: 'perps-market-details-adjust-margin-action-sheet',
  CANDLE_PERIOD_BOTTOM_SHEET: 'perps-market-candle-period-bottom-sheet',
  OPEN_INTEREST_INFO_ICON: 'perps-market-details-open-interest-info-icon',
  FUNDING_RATE_INFO_ICON: 'perps-market-details-funding-rate-info-icon',
  BOTTOM_SHEET_TOOLTIP: 'perps-market-details-bottom-sheet-tooltip',
  GEO_BLOCK_BOTTOM_SHEET_TOOLTIP:
    'perps-market-details-geo-block-bottom-sheet-tooltip',
  MARKET_HOURS_BANNER: 'perps-market-hours-banner',
  MARKET_HOURS_INFO_BUTTON: 'perps-market-hours-banner-info-button',
  MARKET_HOURS_BOTTOM_SHEET_TOOLTIP:
    'perps-market-details-market-hours-bottom-sheet-tooltip',
  STOP_LOSS_PROMPT_BANNER: 'perps-market-details-stop-loss-prompt-banner',
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

// ========================================
// PERPS MARKET BALANCE ACTIONS SELECTORS
// ========================================

export const PerpsMarketBalanceActionsSelectorsIDs = {
  CONTAINER: 'perps-market-balance-actions',
  BALANCE_VALUE: 'perps-market-balance-value',
  AVAILABLE_BALANCE_TEXT: 'perps-market-available-balance-text',
  PNL_VALUE: 'perps-market-pnl-value',
  ADD_FUNDS_BUTTON: 'perps-market-add-funds-button',
  WITHDRAW_BUTTON: 'perps-market-withdraw-button',
  GEO_BLOCK_BOTTOM_SHEET_TOOLTIP: 'perps-market-balance-geo-block-tooltip',
  LEARN_MORE_BUTTON: 'perps-market-balance-learn-more-button',
  EMPTY_STATE_TITLE: 'perps-market-empty-state-title',
  EMPTY_STATE_DESCRIPTION: 'perps-market-empty-state-description',
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
  CHARACTER_IMAGE: 'perps-tutorial-character-image',
  TUTORIAL_CARD: 'perps-tutorial-card',
} as const;

// ========================================
// PERPS STOP LOSS PROMPT BANNER SELECTORS
// ========================================

export const PerpsStopLossPromptSelectorsIDs = {
  CONTAINER: 'perps-stop-loss-prompt-container',
  ADD_MARGIN_BUTTON: 'perps-stop-loss-prompt-add-margin-button',
  TOGGLE: 'perps-stop-loss-prompt-toggle',
  LOADING: 'perps-stop-loss-prompt-loading',
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
  LIMIT_PRICE_INFO_ICON: 'perps-order-view-limit-price-info-icon',
  MARGIN_INFO_ICON: 'perps-order-view-margin-info-icon',
  LIQUIDATION_PRICE_INFO_ICON: 'perps-order-view-liquidation-price-info-icon',
  FEES_INFO_ICON: 'perps-order-view-fees-info-icon',
  TP_SL_INFO_ICON: 'perps-order-view-tp-sl-info-icon',
  // Buttons present in PerpsOrderView (TouchableOpacity with testID)
  TAKE_PROFIT_BUTTON: 'perps-order-view-stop-loss-button',
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
  DISPLAY_TOGGLE_BUTTON: 'display-toggle-button',
  CLOSE_POSITION_CONFIRM_BUTTON: 'close-position-confirm-button',
  CLOSE_POSITION_CANCEL_BUTTON: 'close-position-cancel-button',
  FEES_TOOLTIP_BUTTON: 'close-position-fees-tooltip-button',
  POINTS_TOOLTIP_BUTTON: 'close-position-points-tooltip-button',
  YOU_RECEIVE_TOOLTIP_BUTTON: 'close-position-you-receive-tooltip-button',
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

  // Activity link
  ACTIVITY_LINK: 'perps-market-tabs-activity-link',

  // Loading states
  SKELETON_TAB_BAR: 'perps-market-tabs-skeleton-tab-bar',
  SKELETON_CONTENT: 'perps-market-tabs-skeleton-content',
};

// ========================================
// PERPS HERO CARD VIEW SELECTORS
// ========================================

export const PerpsHeroCardViewSelectorsIDs = {
  CONTAINER: 'perps-hero-card-view-container',
  HEADER: 'perps-hero-card-view-header',
  HEADER_TITLE: 'perps-hero-card-view-header-title',
  CLOSE_BUTTON: 'perps-hero-card-view-close-button',
  CAROUSEL_WRAPPER: 'perps-hero-card-view-carousel-wrapper',
  CAROUSEL: 'perps-hero-card-view-carousel',
  CARD_CONTAINER: 'perps-hero-card-view-card-container',
  REFERRAL_CODE_TAG: 'perps-hero-card-view-referral-code-tag',
  QR_CODE: 'perps-hero-card-view-qr-code',
  ASSET_SYMBOL: 'perps-hero-card-view-asset-symbol',
  DIRECTION_BADGE: 'perps-hero-card-view-direction-badge',
  DIRECTION_BADGE_TEXT: 'perps-hero-card-view-direction-badge-text',
  PNL_TEXT: 'perps-hero-card-view-pnl-text',
  SHARE_BUTTON: 'perps-hero-card-view-share-button',
  DOT_INDICATOR: 'perps-hero-card-view-dot-indicator',
} as const;

// Helper functions for dynamic hero card selectors
export const getPerpsHeroCardViewSelector = {
  cardContainer: (index: number) =>
    `${PerpsHeroCardViewSelectorsIDs.CARD_CONTAINER}-${index}`,
  referralCodeTag: (index: number) =>
    `${PerpsHeroCardViewSelectorsIDs.REFERRAL_CODE_TAG}-${index}`,
  qrCode: (index: number) =>
    `${PerpsHeroCardViewSelectorsIDs.QR_CODE}-${index}`,
  assetSymbol: (index: number) =>
    `${PerpsHeroCardViewSelectorsIDs.ASSET_SYMBOL}-${index}`,
  directionBadge: (index: number) =>
    `${PerpsHeroCardViewSelectorsIDs.DIRECTION_BADGE}-${index}`,
  directionBadgeText: (index: number) =>
    `${PerpsHeroCardViewSelectorsIDs.DIRECTION_BADGE_TEXT}-${index}`,
  pnlText: (index: number) =>
    `${PerpsHeroCardViewSelectorsIDs.PNL_TEXT}-${index}`,
};

// ========================================
// PERPS GENERAL (CROSS-COMPONENT) SELECTORS
// ========================================

export const PerpsGeneralSelectorsIDs = {
  // TPSL bottom sheet primary action button ("Set" / "Updating")
  BOTTOM_SHEET_FOOTER_BUTTON: 'bottomsheetfooter-button',
  // Order success toast dismiss button on PerpsOrderView
  ORDER_SUCCESS_TOAST_DISMISS_BUTTON:
    'perps-order-success-toast-dismiss-button',
  // Common action buttons that may appear in flows (keep for E2E compatibility)
  CONTINUE_BUTTON: 'continue-button',
  DONE_BUTTON: 'done-button',
} as const;

// ========================================
// PERPS ORDER BOOK VIEW SELECTORS
// ========================================

export const PerpsOrderBookViewSelectorsIDs = {
  CONTAINER: 'perps-order-book-view',
  BACK_BUTTON: 'perps-order-book-back-button',
  SCROLL_VIEW: 'perps-order-book-scroll-view',
  DEPTH_CHART: 'perps-order-book-depth-chart',
  TABLE: 'perps-order-book-table',
  LONG_BUTTON: 'perps-order-book-long-button',
  SHORT_BUTTON: 'perps-order-book-short-button',
  DEPTH_BAND_BUTTON: 'perps-order-book-depth-band-button',
  DEPTH_BAND_OPTION: 'perps-order-book-depth-band-option',
  UNIT_TOGGLE_BASE: 'perps-order-book-unit-toggle-base',
  UNIT_TOGGLE_USD: 'perps-order-book-unit-toggle-usd',
} as const;

// ========================================
// PERPS ORDER BOOK TABLE SELECTORS
// ========================================

export const PerpsOrderBookTableSelectorsIDs = {
  CONTAINER: 'perps-order-book-table',
  UNIT_TOGGLE: 'perps-order-book-unit-toggle',
  BID_ROW: 'perps-order-book-bid-row',
  ASK_ROW: 'perps-order-book-ask-row',
  SPREAD: 'perps-order-book-spread',
} as const;

// ========================================
// PERPS ORDER BOOK DEPTH CHART SELECTORS
// ========================================

export const PerpsOrderBookDepthChartSelectorsIDs = {
  CONTAINER: 'perps-order-book-depth-chart',
} as const;
