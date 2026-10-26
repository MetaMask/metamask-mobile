import { predictPositionsOptions } from './positions';

describe('predictPositionsOptions', () => {
  it('disables retries after a positions request timeout', () => {
    const options = predictPositionsOptions({
      address: '0x1234567890123456789012345678901234567890',
    });

    expect(options.retry).toBe(false);
  });
});
