import { formatSignedUsd, formatUsd } from './rewardsUiFixtures';

describe('rewardsUiFixtures', () => {
  it('formats a dollar amount with two decimals', () => {
    expect(formatUsd(41.75)).toBe('$41.75');
  });

  it('formats a signed dollar amount with a leading plus', () => {
    expect(formatSignedUsd(18.2)).toBe('+$18.20');
  });
});
