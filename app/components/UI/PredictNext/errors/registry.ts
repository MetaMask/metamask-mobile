export enum PredictErrorCode {
  VENUE_UNAVAILABLE = 'VENUE_UNAVAILABLE',
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  RATE_LIMITED = 'RATE_LIMITED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  UNSUPPORTED_VENUE = 'UNSUPPORTED_VENUE',
  GEO_BLOCKED = 'GEO_BLOCKED',
  FEATURE_DISABLED = 'FEATURE_DISABLED',
  SERVICE_DEGRADED = 'SERVICE_DEGRADED',
  MARKET_NOT_FOUND = 'MARKET_NOT_FOUND',
  MARKET_NOT_TRADEABLE = 'MARKET_NOT_TRADEABLE',
  QUOTE_UNAVAILABLE = 'QUOTE_UNAVAILABLE',
  BALANCE_UNAVAILABLE = 'BALANCE_UNAVAILABLE',
  INSUFFICIENT_LIQUIDITY = 'INSUFFICIENT_LIQUIDITY',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  UNKNOWN = 'UNKNOWN',
}

export type PredictErrorCategory =
  | 'empty_state'
  | 'unavailable'
  | 'action_failed'
  | 'degraded';

export interface PredictErrorDefaults {
  category: PredictErrorCategory;
  message: string;
  recoverable: boolean;
}

export const predictErrorRegistry: Record<
  PredictErrorCode,
  PredictErrorDefaults
> = {
  [PredictErrorCode.UNAUTHENTICATED]: {
    category: 'unavailable',
    message: 'Prediction authentication is unavailable.',
    recoverable: true,
  },
  [PredictErrorCode.VENUE_UNAVAILABLE]: {
    category: 'unavailable',
    message: 'This prediction venue is unavailable.',
    recoverable: true,
  },
  [PredictErrorCode.RATE_LIMITED]: {
    category: 'degraded',
    message: 'Too many requests. Try again later.',
    recoverable: true,
  },
  [PredictErrorCode.NETWORK_ERROR]: {
    category: 'action_failed',
    message: 'Unable to reach the prediction service.',
    recoverable: true,
  },
  [PredictErrorCode.INVALID_RESPONSE]: {
    category: 'action_failed',
    message: 'The prediction service returned an invalid response.',
    recoverable: false,
  },
  [PredictErrorCode.UNSUPPORTED_VENUE]: {
    category: 'empty_state',
    message: 'This prediction venue is not supported.',
    recoverable: false,
  },
  [PredictErrorCode.GEO_BLOCKED]: {
    category: 'empty_state',
    message: 'This prediction venue is not available in your region.',
    recoverable: false,
  },
  [PredictErrorCode.FEATURE_DISABLED]: {
    category: 'empty_state',
    message: 'Predictions are not available right now.',
    recoverable: false,
  },
  [PredictErrorCode.SERVICE_DEGRADED]: {
    category: 'degraded',
    message: 'Prediction data may be temporarily out of date.',
    recoverable: true,
  },
  [PredictErrorCode.MARKET_NOT_FOUND]: {
    category: 'action_failed',
    message: 'This prediction market could not be found.',
    recoverable: false,
  },
  [PredictErrorCode.MARKET_NOT_TRADEABLE]: {
    category: 'action_failed',
    message: 'This market is no longer tradeable.',
    recoverable: false,
  },
  [PredictErrorCode.QUOTE_UNAVAILABLE]: {
    category: 'unavailable',
    message: 'A quote is unavailable right now.',
    recoverable: true,
  },
  [PredictErrorCode.BALANCE_UNAVAILABLE]: {
    category: 'unavailable',
    message: 'Your balance is unavailable right now.',
    recoverable: true,
  },
  [PredictErrorCode.INSUFFICIENT_LIQUIDITY]: {
    category: 'action_failed',
    message: 'Not enough liquidity to quote this amount.',
    recoverable: false,
  },
  [PredictErrorCode.INSUFFICIENT_BALANCE]: {
    category: 'action_failed',
    message: 'Not enough balance for this order.',
    recoverable: false,
  },
  [PredictErrorCode.UNKNOWN]: {
    category: 'action_failed',
    message: 'Something went wrong.',
    recoverable: true,
  },
};
