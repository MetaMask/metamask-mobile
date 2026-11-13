import {
  formatPostTradePairLabel,
  type PostTradePairLabelParams,
} from './formatPostTradePairLabel';

const createParams = (
  overrides: Partial<PostTradePairLabelParams> = {},
): PostTradePairLabelParams => ({
  sourceAmount: '1.5',
  sourceSymbol: 'ETH',
  destAmount: '3000',
  destSymbol: 'USDC',
  ...overrides,
});

describe('formatPostTradePairLabel', () => {
  it('joins formatted source and destination amounts with their symbols', () => {
    const params = createParams();

    const result = formatPostTradePairLabel(params);

    expect(result).toBe('1.5 ETH → 3,000 USDC');
  });

  it('truncates amounts to 5 decimal places instead of rounding up', () => {
    const params = createParams({
      sourceAmount: '0.123456789',
      destAmount: '2.999999',
    });

    const result = formatPostTradePairLabel(params);

    expect(result).toBe('0.12345 ETH → 2.99999 USDC');
  });

  it('trims trailing zeros after truncating to 5 decimal places', () => {
    const params = createParams({
      sourceAmount: '1.50000000',
      destAmount: '2.00',
    });

    const result = formatPostTradePairLabel(params);

    expect(result).toBe('1.5 ETH → 2 USDC');
  });

  it('groups thousands in both amounts', () => {
    const params = createParams({
      sourceAmount: '1234.5678',
      destAmount: '1234567.891',
    });

    const result = formatPostTradePairLabel(params);

    expect(result).toBe('1,234.5678 ETH → 1,234,567.891 USDC');
  });

  it('expands exponent notation before truncating to 5 decimal places', () => {
    const params = createParams({
      sourceAmount: '2.5e-5',
      destAmount: '1e-7',
    });

    const result = formatPostTradePairLabel(params);

    expect(result).toBe('0.00002 ETH → 0 USDC');
  });

  it('shows zero for an amount below 5 decimal places', () => {
    const params = createParams({ sourceAmount: '0.000001' });

    const result = formatPostTradePairLabel(params);

    expect(result).toBe('0 ETH → 3,000 USDC');
  });

  it('omits a missing source amount without a leading space', () => {
    const params = createParams({ sourceAmount: undefined });

    const result = formatPostTradePairLabel(params);

    expect(result).toBe('ETH → 3,000 USDC');
  });

  it('omits a missing destination amount without a double space before the symbol', () => {
    const params = createParams({ destAmount: undefined });

    const result = formatPostTradePairLabel(params);

    expect(result).toBe('1.5 ETH → USDC');
  });
});
