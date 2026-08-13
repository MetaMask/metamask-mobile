import { PredictError, PredictErrorCode } from '../../errors';
import { parsePredictAccountReadiness } from './account';

describe('Predict Account Readiness contract', () => {
  it.each(['setup_required', 'ready'] as const)(
    'parses %s readiness and discards unknown fields',
    (status) => {
      const result = parsePredictAccountReadiness({
        venueId: 'kalshi',
        status,
        userId: 'discard',
      });

      expect(result).toEqual({ venueId: 'kalshi', status });
      expect(result).not.toHaveProperty('userId');
    },
  );

  it.each([
    { venueId: '', status: 'ready' },
    { venueId: 'kalshi', status: 'unknown' },
    { venueId: 'kalshi' },
  ])('fails closed for malformed readiness %#', (value) => {
    expect(() => parsePredictAccountReadiness(value)).toThrow(
      'Invalid Predict API response.',
    );

    try {
      parsePredictAccountReadiness(value);
    } catch (error) {
      expect(error).toBeInstanceOf(PredictError);
      expect((error as PredictError).code).toBe(PredictErrorCode.UNKNOWN);
    }
  });
});
