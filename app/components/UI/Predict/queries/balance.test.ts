import { predictBalanceOptions } from './balance';

describe('predictBalanceOptions', () => {
  it('stops retrying a balance request after a timeout', () => {
    const options = predictBalanceOptions({
      address: '0x1234567890123456789012345678901234567890',
    });
    const retry = options.retry as (
      failureCount: number,
      error: Error,
    ) => boolean;

    expect(retry(0, new Error('Predict balance request timed out'))).toBe(
      false,
    );
    expect(retry(0, new Error('Network unavailable'))).toBe(true);
    expect(retry(2, new Error('Network unavailable'))).toBe(false);
  });
});
