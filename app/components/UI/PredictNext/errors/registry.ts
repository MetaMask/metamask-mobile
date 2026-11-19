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
  PREVIEW_EXPIRED = 'PREVIEW_EXPIRED',
  BALANCE_UNAVAILABLE = 'BALANCE_UNAVAILABLE',
  INSUFFICIENT_LIQUIDITY = 'INSUFFICIENT_LIQUIDITY',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  INSUFFICIENT_POSITION = 'INSUFFICIENT_POSITION',
  POSITION_UNAVAILABLE = 'POSITION_UNAVAILABLE',
  /** No Order operation exists for the Preview (yet). */
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  ORDER_PREVIEW_MISMATCH = 'ORDER_PREVIEW_MISMATCH',
  ORDER_OUTCOME_UNKNOWN = 'ORDER_OUTCOME_UNKNOWN',
  VENUE_SIGNING_REFUSED = 'VENUE_SIGNING_REFUSED',
  APP_UPDATE_REQUIRED = 'APP_UPDATE_REQUIRED',
  /** The user has no enabled venue account yet. Onboarding resolves it. */
  VENUE_ACCOUNT_NOT_ENABLED = 'VENUE_ACCOUNT_NOT_ENABLED',
  /** A withdrawal below the venue's minimum: the amount is fixable. */
  AMOUNT_BELOW_MINIMUM = 'AMOUNT_BELOW_MINIMUM',
  /** Another deposit waits for its address or its transfer. */
  DEPOSIT_IN_PROGRESS = 'DEPOSIT_IN_PROGRESS',
  /** No deposit with that ID belongs to the Predict User. */
  DEPOSIT_NOT_FOUND = 'DEPOSIT_NOT_FOUND',
  /** Only a deposit waiting for a transfer with no reported hash cancels. */
  DEPOSIT_NOT_CANCELLABLE = 'DEPOSIT_NOT_CANCELLABLE',
  /** The venue refused the amount. No funds moved. */
  DEPOSIT_AMOUNT_REJECTED = 'DEPOSIT_AMOUNT_REJECTED',
  /** The venue refused the deposit or its answer was lost. No funds moved;
   * a new deposit starts with a new client operation ID. */
  DEPOSIT_FAILED = 'DEPOSIT_FAILED',
  /** The signed deposit, or its client operation ID, names another
   * request. Nothing was stored or relayed. */
  DEPOSIT_MISMATCH = 'DEPOSIT_MISMATCH',
  /** The reported transfer does not fit the deposit: another chain, a
   * hash the backend refuses, another hash than the one it has, a hash
   * another deposit holds, or a deposit that takes no transfer. The backend
   * stored nothing. */
  DEPOSIT_TRANSFER_MISMATCH = 'DEPOSIT_TRANSFER_MISMATCH',
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
  [PredictErrorCode.ORDER_NOT_FOUND]: {
    category: 'action_failed',
    message:
      'Your order could not be found. Its outcome has not been confirmed.',
    recoverable: true,
  },
  [PredictErrorCode.ORDER_PREVIEW_MISMATCH]: {
    category: 'action_failed',
    message:
      'The signed order does not match this quote. Refresh and review it again.',
    recoverable: true,
  },
  [PredictErrorCode.ORDER_OUTCOME_UNKNOWN]: {
    category: 'action_failed',
    message:
      'Order outcome could not be confirmed. Check your activity or contact support.',
    recoverable: false,
  },
  [PredictErrorCode.VENUE_SIGNING_REFUSED]: {
    category: 'action_failed',
    message:
      'This request could not be authorized. Review it before trying again.',
    recoverable: true,
  },
  [PredictErrorCode.APP_UPDATE_REQUIRED]: {
    category: 'unavailable',
    message: 'Update MetaMask to continue trading with this venue.',
    recoverable: false,
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
  [PredictErrorCode.PREVIEW_EXPIRED]: {
    category: 'action_failed',
    message: 'This quote expired. Refresh to get a new one.',
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
  // Over-sell / not-owned: the backend validates against authoritative
  // Venue evidence, so a local over-sell that slips through fails here.
  [PredictErrorCode.INSUFFICIENT_POSITION]: {
    category: 'action_failed',
    message: 'Not enough contracts in this position.',
    recoverable: true,
  },
  [PredictErrorCode.POSITION_UNAVAILABLE]: {
    category: 'unavailable',
    message: 'Your position is unavailable right now.',
    recoverable: true,
  },
  [PredictErrorCode.AMOUNT_BELOW_MINIMUM]: {
    category: 'action_failed',
    message: 'The withdrawal amount is below the venue minimum.',
    recoverable: true,
  },
  [PredictErrorCode.VENUE_ACCOUNT_NOT_ENABLED]: {
    category: 'unavailable',
    message: 'Finish setting up your account to continue.',
    recoverable: true,
  },
  [PredictErrorCode.DEPOSIT_IN_PROGRESS]: {
    category: 'action_failed',
    message: 'A deposit is already in progress.',
    recoverable: false,
  },
  [PredictErrorCode.DEPOSIT_NOT_FOUND]: {
    category: 'action_failed',
    message: 'This deposit could not be found.',
    recoverable: false,
  },
  [PredictErrorCode.DEPOSIT_NOT_CANCELLABLE]: {
    category: 'action_failed',
    message: 'This deposit can no longer be cancelled.',
    recoverable: false,
  },
  [PredictErrorCode.DEPOSIT_AMOUNT_REJECTED]: {
    category: 'action_failed',
    message: 'This deposit amount was not accepted. Try another amount.',
    recoverable: true,
  },
  [PredictErrorCode.DEPOSIT_FAILED]: {
    category: 'action_failed',
    message: 'The deposit did not go through. No funds were moved.',
    recoverable: true,
  },
  [PredictErrorCode.DEPOSIT_MISMATCH]: {
    category: 'action_failed',
    message: 'The signed deposit does not match this request. Start again.',
    recoverable: true,
  },
  [PredictErrorCode.DEPOSIT_TRANSFER_MISMATCH]: {
    category: 'action_failed',
    message: 'The transfer does not match this deposit. Contact support.',
    recoverable: false,
  },
  [PredictErrorCode.UNKNOWN]: {
    category: 'action_failed',
    message: 'Something went wrong.',
    recoverable: true,
  },
};
