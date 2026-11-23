import { PredictError } from './PredictError';
import { PredictErrorCode } from './registry';

describe('PredictError', () => {
  it('uses registered defaults for known error codes', () => {
    const error = PredictError.from(PredictErrorCode.VENUE_UNAVAILABLE);

    expect(error.code).toBe(PredictErrorCode.VENUE_UNAVAILABLE);
    expect(error.category).toBe('unavailable');
    expect(error.message).toBe('This prediction venue is unavailable.');
    expect(error.recoverable).toBe(true);
  });

  it('normalizes unrecognized error codes to unknown', () => {
    const error = PredictError.from('NOT_REGISTERED');

    expect(error.code).toBe(PredictErrorCode.UNKNOWN);
    expect(error.category).toBe('action_failed');
    expect(error.message).toBe('Something went wrong.');
  });

  it('applies message and metadata overrides', () => {
    const metadata = { status: 503 };

    const error = PredictError.from(PredictErrorCode.SERVICE_DEGRADED, {
      message: 'Service unavailable.',
      metadata,
    });

    expect(error.message).toBe('Service unavailable.');
    expect(error.metadata).toBe(metadata);
  });

  it.each([
    PredictErrorCode.ORDER_OUTCOME_UNKNOWN,
    PredictErrorCode.ORDER_NOT_FOUND,
  ])('never claims a missing or unknown order was not placed: %s', (code) => {
    const error = PredictError.from(code);
    expect(error.message).not.toContain('not placed');
    expect(error.message).toMatch(/not.*confirmed/iu);
  });

  it('requires an app update without suggesting an authorization renewal', () => {
    const error = PredictError.from(PredictErrorCode.APP_UPDATE_REQUIRED);
    expect(error.recoverable).toBe(false);
    expect(error.message).toContain('Update MetaMask');
  });
});
