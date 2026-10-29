import { predictPositionsOptions } from './positions';

describe('predictPositionsOptions', () => {
  it('stops retrying a positions request after a timeout', () => {
    const options = predictPositionsOptions({
      address: '0x1234567890123456789012345678901234567890',
    });
    const retry = options.retry as (
      failureCount: number,
      error: Error,
    ) => boolean;

    expect(retry(0, new Error('Predict positions request timed out'))).toBe(
      false,
    );
    expect(retry(0, new Error('Network unavailable'))).toBe(true);
    expect(retry(2, new Error('Network unavailable'))).toBe(false);
  });
});
