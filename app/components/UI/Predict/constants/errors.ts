import { strings } from '../../../../../locales/i18n';

export type PredictErrorCode =
  (typeof PREDICT_ERROR_CODES)[keyof typeof PREDICT_ERROR_CODES];

/**
 * Predict feature constants for error handling and logging
 */
export const PREDICT_CONSTANTS = {
  FEATURE_NAME: 'Predict', // For Sentry error filtering - enables "feature:Predict" queries
  CONTROLLER_NAME: 'PredictController',
} as const;

export const PREDICT_ERROR_CODES = {
  NOT_ELIGIBLE: 'PREDICT_NOT_ELIGIBLE',
  ORDER_NOT_FULLY_FILLED: 'PREDICT_ORDER_NOT_FULLY_FILLED',
  PREVIEW_NO_ORDER_BOOK: 'PREDICT_PREVIEW_NO_ORDER_BOOK',
  PREVIEW_NO_ORDER_MATCH_BUY: 'PREDICT_PREVIEW_NO_ORDER_MATCH_BUY',
  PREVIEW_NO_ORDER_MATCH_SELL: 'PREDICT_PREVIEW_NO_ORDER_MATCH_SELL',
  PLACE_ORDER_FAILED: 'PREDICT_PLACE_ORDER_FAILED',
  PREVIEW_FAILED: 'PREDICT_PREVIEW_FAILED',
  CLAIM_FAILED: 'PREDICT_CLAIM_FAILED',
  UNKNOWN_ERROR: 'PREDICT_UNKNOWN_ERROR',
  MARKETS_FAILED: 'PREDICT_MARKETS_FAILED',
  MARKET_DETAILS_FAILED: 'PREDICT_MARKET_DETAILS_FAILED',
  PRICE_HISTORY_FAILED: 'PREDICT_PRICE_HISTORY_FAILED',
  POSITIONS_FAILED: 'PREDICT_POSITIONS_FAILED',
  ACTIVITY_NOT_AVAILABLE: 'PREDICT_ACTIVITY_NOT_AVAILABLE',
  DEPOSIT_FAILED: 'PREDICT_DEPOSIT_FAILED',
  WITHDRAW_FAILED: 'PREDICT_WITHDRAW_FAILED',
  BUY_ORDER_NOT_FULLY_FILLED: 'PREDICT_BUY_ORDER_NOT_FULLY_FILLED',
  SELL_ORDER_NOT_FULLY_FILLED: 'PREDICT_SELL_ORDER_NOT_FULLY_FILLED',
} as const;

export const getPredictErrorMessages = () =>
  ({
    [PREDICT_ERROR_CODES.PREVIEW_NO_ORDER_BOOK]: strings(
      'predict.error_messages.preview_no_order_book',
    ),
    [PREDICT_ERROR_CODES.PREVIEW_NO_ORDER_MATCH_BUY]: strings(
      'predict.error_messages.preview_no_order_match_buy',
    ),
    [PREDICT_ERROR_CODES.PREVIEW_NO_ORDER_MATCH_SELL]: strings(
      'predict.error_messages.preview_no_order_match_sell',
    ),
    [PREDICT_ERROR_CODES.PLACE_ORDER_FAILED]: strings(
      'predict.error_messages.place_order_failed',
    ),
    [PREDICT_ERROR_CODES.NOT_ELIGIBLE]: strings(
      'predict.error_messages.not_eligible',
    ),
    [PREDICT_ERROR_CODES.PREVIEW_FAILED]: strings(
      'predict.error_messages.preview_failed',
    ),
    [PREDICT_ERROR_CODES.CLAIM_FAILED]: strings(
      'predict.error_messages.claim_failed',
    ),
    [PREDICT_ERROR_CODES.UNKNOWN_ERROR]: strings(
      'predict.error_messages.unknown_error',
    ),
    [PREDICT_ERROR_CODES.ORDER_NOT_FULLY_FILLED]: strings(
      'predict.error_messages.order_not_fully_filled',
    ),
    [PREDICT_ERROR_CODES.BUY_ORDER_NOT_FULLY_FILLED]: strings(
      'predict.error_messages.buy_order_not_fully_filled',
    ),
    [PREDICT_ERROR_CODES.SELL_ORDER_NOT_FULLY_FILLED]: strings(
      'predict.error_messages.sell_order_not_fully_filled',
    ),
  }) as const;
