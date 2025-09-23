/**
 * Perps event property keys and values - matching dashboard requirements exactly
 * Event names are defined in MetaMetrics.events.ts as the single source of truth
 */

/**
 * Event property keys - ensures consistent property naming
 */
export const PerpsEventProperties = {
  // Common properties
  TIMESTAMP: 'Timestamp',
  ASSET: 'Asset',
  DIRECTION: 'Direction',
  SOURCE: 'Source',

  // Trade properties
  LEVERAGE: 'Leverage',
  LEVERAGE_USED: 'Leverage Used',
  ORDER_SIZE: 'Order Size',
  MARGIN_USED: 'Margin used',
  ORDER_TYPE: 'orderType', // lowercase per dashboard
  LIMIT_PRICE: 'Limit Price',
  FEES: 'Fees',
  FEE: 'Fee',
  METAMASK_FEE: 'MetaMask Fee',
  METAMASK_FEE_RATE: 'MetaMask Fee Rate',
  DISCOUNT_PERCENTAGE: 'Discount Percentage',
  ESTIMATED_REWARDS: 'estimatedRewards',
  ASSET_PRICE: 'Asset Price',
  COMPLETION_DURATION: 'completionDuration',

  // Position properties
  OPEN_POSITION: 'Open Position',
  OPEN_POSITION_SIZE: 'Open Position Size',
  UNREALIZED_PNL_DOLLAR: 'Unrealized $PnL',
  UNREALIZED_PNL_PERCENT: 'Unrealized %PnL',
  CLOSE_VALUE: 'Close value',
  CLOSE_PERCENTAGE: 'Close percentage',
  CLOSE_TYPE: 'Close type',
  PERCENTAGE_CLOSED: 'Percentage closed',
  PNL_DOLLAR: '$PnL',
  PNL_PERCENT: '%PnL',
  RECEIVED_AMOUNT: 'Received amount',

  // Order type variations
  CURRENT_ORDER_TYPE: 'current order type',
  SELECTED_ORDER_TYPE: 'selected order type',

  // Funding properties
  SOURCE_CHAIN: 'Source Chain',
  SOURCE_ASSET: 'SourceAsset',
  SOURCE_AMOUNT: 'SourceAmount',
  DESTINATION_AMOUNT: 'destinationAmount',
  NETWORK_FEE: 'networkFee',
  AVAILABLE_AMOUNT: 'availableAmount',
  WITHDRAWAL_AMOUNT: 'withdrawalAmount',

  // Chart properties
  INTERACTION_TYPE: 'Interaction Type',
  TIME_SERIE_SELECTED: 'Time serie selected',
  CANDLE_PERIOD: 'candlePeriod',

  // Risk management properties
  STOP_LOSS_PRICE: 'Stop Loss Price',
  STOP_LOSS_PERCENT: 'Stop Loss %',
  TAKE_PROFIT_PRICE: 'Take Profit Price',
  TAKE_PROFIT_PERCENT: 'Take Profit %',
  POSITION_SIZE: 'Position size',
  POSITION_AGE: 'position age',

  // Notification properties
  NOTIFICATION_TYPE: 'Notification Type',

  // Other properties
  INPUT_METHOD: 'inputMethod', // camelCase per requirements
  FAILURE_REASON: 'Failure Reason',
  WARNING_TYPE: 'Warning Type',
  WARNING_MESSAGE: 'Warning Message',
  ERROR_TYPE: 'Error Type',
  ERROR_MESSAGE: 'Error Message',
  COMPLETION_DURATION_TUTORIAL: 'Completion Duration',
  STEPS_VIEWED: 'Steps Viewed',
  VIEW_OCCURRENCES: 'View occurrences',
  AMOUNT_FILLED: 'Amount filled',
  REMAINING_AMOUNT: 'Remaining amount',
  PERP_ACCOUNT_BALANCE: 'Perp Account $ Balance',
} as const;

/**
 * Property value constants
 */
export const PerpsEventValues = {
  DIRECTION: {
    LONG: 'Long',
    SHORT: 'Short',
  },
  ORDER_TYPE: {
    MARKET: 'market',
    LIMIT: 'limit',
  },
  ORDER_TYPE_CAPITALIZED: {
    MARKET: 'Market',
    LIMIT: 'Limit',
  },
  INPUT_METHOD: {
    SLIDER: 'slider',
    KEYBOARD: 'keyboard',
    PRESET: 'preset',
    MANUAL: 'manual',
    PERCENTAGE_BUTTON: 'percentage_button',
  },
  SOURCE: {
    BANNER: 'banner',
    NOTIFICATION: 'notification',
    MAIN_ACTION_BUTTON: 'mainActionButton',
    POSITION_TAB: 'positionTab',
    PERP_MARKETS: 'perpMarkets',
    DEEPLINK: 'deeplink',
    TUTORIAL: 'Tutorial',
    TRADE_SCREEN: 'tradeScreen',
    HOMESCREEN_TAB: 'HomescreenTab',
    PERP_ASSET_SCREEN: 'PerpAssetScreen',
    PERP_MARKET: 'Perp market',
    PERP_MARKET_SEARCH: 'perp market search',
    POSITION_SCREEN: 'positionScreen',
  },
  WARNING_TYPE: {
    MINIMUM_DEPOSIT: 'minimum deposit',
    MINIMUM_ORDER_SIZE: 'minimum order size',
    INSUFFICIENT_BALANCE: 'insufficient balance',
  },
  ERROR_TYPE: {
    NETWORK: 'network',
    APP_CRASH: 'app crash',
    BACKEND: 'backend',
    VALIDATION: 'validation',
  },
  INTERACTION_TYPE: {
    TAP: 'tap',
    ZOOM: 'zoom',
    SLIDE: 'slide',
    CANDLE_PERIOD_CHANGE: 'candle_period_change',
  },
  NOTIFICATION_TYPE: {
    POSITION_LIQUIDATED: 'PositionLiquidated',
    TP_EXECUTED: 'TP executed',
    SL_EXECUTED: 'SL executed',
    LIMIT_ORDER_EXECUTED: 'Limit order executed',
  },
  CLOSE_TYPE: {
    FULL: 'full',
    PARTIAL: 'partial',
  },
} as const;
