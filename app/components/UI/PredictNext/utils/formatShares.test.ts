import BigNumber from 'bignumber.js';

import { formatContractCount, formatSharesAmount } from './formatShares';

describe('formatSharesAmount', () => {
  it('trims trailing zeros from a decimal string', () => {
    const result = formatSharesAmount('10.00');

    expect(result).toBe('10');
  });
});

describe('formatContractCount', () => {
  it.each([
    [43, '43'],
    [12.5, '12.5'],
    [0.29, '0.29'],
    ['43.00', '43'],
    ['12.50', '12.5'],
  ] as const)('formats %p as %p', (value, expected) => {
    const result = formatContractCount(value);

    expect(result).toBe(expected);
  });

  it('rounds a count with more than two decimals down to hundredths', () => {
    const result = formatContractCount('12.509999999');

    expect(result).toBe('12.5');
  });

  it('formats a BigNumber difference without floating-point residue', () => {
    const result = formatContractCount(new BigNumber(12.5).minus('7.29'));

    expect(result).toBe('5.21');
  });
});
