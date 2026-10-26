import { predictBalanceOptions } from './balance';

describe('predictBalanceOptions', () => {
  it('disables retries after a balance request timeout', () => {
    const options = predictBalanceOptions({
      address: '0x1234567890123456789012345678901234567890',
    });

    expect(options.retry).toBe(false);
  });
});
