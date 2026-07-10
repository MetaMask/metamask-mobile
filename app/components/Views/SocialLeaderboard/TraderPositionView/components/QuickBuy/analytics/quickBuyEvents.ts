/**
 * Quick Buy analytics — property keys, closed-set values and source unions.
 * Property keys mirror the segment-schema YAMLs in `metamask-mobile-social`
 * (quick-buy-* events). Event names live in `MetaMetrics.events.ts`
 * (see `SOCIAL_QUICK_BUY_*`) as the single source of truth.
 */

/** Property-key constants for Quick Buy analytics property bags. */
export const QuickBuyEventProperties = {
  AMOUNT_SELECTION_METHOD: 'amount_selection_method',
  AMOUNT_TOKEN: 'amount_token',
  AMOUNT_USD: 'amount_usd',
  ASSET_NAME: 'asset_name',
  CAIP19: 'caip19',
  DISMISS_STAGE: 'dismiss_stage',
  EXECUTION_TIME_MS: 'execution_time_ms',
  INTERACTION_TYPE: 'interaction_type',
  LATENCY_MS: 'latency_ms',
  MARKET_CAP: 'market_cap',
  PAY_WITH_TOKEN: 'pay_with_token',
  PRESET_VALUE: 'preset_value',
  SLIDER_PERCENT: 'slider_percent',
  PREVIOUS_PAY_WITH_TOKEN: 'previous_pay_with_token',
  PREVIOUS_RECEIVE_TOKEN: 'previous_receive_token',
  PREVIOUS_SLIPPAGE: 'previous_slippage',
  QUOTE_COUNT: 'quote_count',
  QUOTE_INDEX: 'quote_index',
  RECEIVE_TOKEN: 'receive_token',
  SLIPPAGE: 'slippage',
  SOURCE: 'source',
  STATUS: 'status',
  TRADE_TYPE: 'trade_type',
  TRADER_ADDRESS: 'trader_address',
  TRADER_TRADE_TYPE: 'trader_trade_type',
  TX_HASH: 'tx_hash',
} as const;

/** Closed-set property values used by enum-typed Quick Buy properties. */
export const QuickBuyEventValues = {
  AMOUNT_SELECTION_METHOD: {
    PRESET: 'preset',
    CUSTOM_INPUT: 'custom_input',
    SLIDER: 'slider',
  },
  DISMISS_STAGE: {
    TOKEN_DETAIL: 'token_detail',
    AMOUNT_SELECTION: 'amount_selection',
    CONFIRMATION: 'confirmation',
  },
  INTERACTION_TYPE: {
    QUOTE_SELECTED: 'quote_selected',
    PAY_WITH_SELECTED: 'pay_with_selected',
    RECEIVE_TOKEN_SELECTED: 'receive_token_selected',
    SLIPPAGE_CHANGED: 'slippage_changed',
  },
  STATUS: {
    SUCCESS: 'success',
    FAILED: 'failed',
  },
  TRADER_TRADE_TYPE: {
    BUY: 'buy',
    SELL: 'sell',
  },
} as const;

/** Surface from which the QuickBuy sheet was opened. */
export type QuickBuySheetSource =
  | 'notification'
  | 'profile_position'
  | 'leaderboard'
  | 'asset_details'
  | 'market_insights'
  | 'security_trust'
  | 'explore_search'
  | 'explore_crypto'
  | 'explore_now'
  | 'explore_rwas'
  | 'explore_trending'
  | 'explore_stocks';
