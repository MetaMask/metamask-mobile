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

interface PredictErrorDefaults {
  category: PredictErrorCategory;
  message: string;
  recoverable: boolean;
}

const ERROR_REGISTRY: Record<PredictErrorCode, PredictErrorDefaults> = {
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

export class PredictError extends Error {
  readonly code: PredictErrorCode;
  readonly category: PredictErrorCategory;
  readonly recoverable: boolean;
  readonly metadata?: Record<string, unknown>;

  private constructor(
    code: PredictErrorCode,
    defaults: PredictErrorDefaults,
    message: string,
    metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'PredictError';
    this.code = code;
    this.category = defaults.category;
    this.recoverable = defaults.recoverable;
    this.metadata = metadata;
  }

  static from(
    code: PredictErrorCode | string,
    overrides: { message?: string; metadata?: Record<string, unknown> } = {},
  ): PredictError {
    const normalizedCode = Object.values(PredictErrorCode).includes(
      code as PredictErrorCode,
    )
      ? (code as PredictErrorCode)
      : PredictErrorCode.UNKNOWN;
    const defaults = ERROR_REGISTRY[normalizedCode];
    return new PredictError(
      normalizedCode,
      defaults,
      overrides.message ?? defaults.message,
      overrides.metadata,
    );
  }
}

export const predictErrorRegistry = ERROR_REGISTRY;
