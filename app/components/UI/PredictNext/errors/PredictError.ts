import {
  PredictErrorCode,
  type PredictErrorDefaults,
  predictErrorRegistry,
} from './registry';

export class PredictError extends Error {
  readonly code: PredictErrorCode;
  readonly category: PredictErrorDefaults['category'];
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
    const defaults = predictErrorRegistry[normalizedCode];

    return new PredictError(
      normalizedCode,
      defaults,
      overrides.message ?? defaults.message,
      overrides.metadata,
    );
  }
}
