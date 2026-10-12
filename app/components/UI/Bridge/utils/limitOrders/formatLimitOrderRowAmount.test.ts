import { formatLimitOrderRowAmount } from './formatLimitOrderRowAmount';

describe('formatLimitOrderRowAmount', () => {
  it.each`
    amount                      | decimals | expected
    ${'2689308145000000000000'} | ${18}    | ${'2,689.30'}
    ${'123129000'}              | ${6}     | ${'123.12'}
    ${'10478240'}               | ${6}     | ${'10.47'}
    ${'220000000'}              | ${6}     | ${'220.00'}
    ${'100000000000000000'}     | ${18}    | ${'0.10'}
    ${'123456789000000000'}     | ${18}    | ${'0.123'}
    ${'34567890000000'}         | ${18}    | ${'0.0000345'}
    ${'999999000000000'}        | ${18}    | ${'0.000999'}
  `(
    'formats $amount with $decimals decimals as $expected',
    ({ amount, decimals, expected }) => {
      const result = formatLimitOrderRowAmount(amount, decimals);

      expect(result).toBe(expected);
    },
  );

  it('floors amounts below 0.00001 instead of rendering every digit', () => {
    const result = formatLimitOrderRowAmount('1', 18);

    expect(result).toBe('< 0.00001');
  });

  it('renders a zero amount with two decimal places', () => {
    const result = formatLimitOrderRowAmount('0', 18);

    expect(result).toBe('0.00');
  });
});
