export enum PredictErrorCode {
  VENUE_UNAVAILABLE = 'VENUE_UNAVAILABLE',
  RATE_LIMITED = 'RATE_LIMITED',
  GEO_BLOCKED = 'GEO_BLOCKED',
  FEATURE_DISABLED = 'FEATURE_DISABLED',
  SERVICE_DEGRADED = 'SERVICE_DEGRADED',
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
  [PredictErrorCode.UNKNOWN]: {
    category: 'action_failed',
    message: 'Something went wrong.',
    recoverable: true,
  },
};
