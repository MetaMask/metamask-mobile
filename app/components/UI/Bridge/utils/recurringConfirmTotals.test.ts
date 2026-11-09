import { multiplyAmountByCount } from './recurringConfirmTotals';

describe('multiplyAmountByCount', () => {
  it('multiplies an integer amount by the repeat count', () => {
    const amount = '120';

    const result = multiplyAmountByCount(amount, 10);

    expect(result).toBe('1200');
  });

  it('multiplies a decimal amount without float rounding', () => {
    const amount = '0.1';

    const result = multiplyAmountByCount(amount, 10);

    expect(result).toBe('1');
  });

  it('keeps trailing decimal digits from the source amount', () => {
    const amount = '1.25';

    const result = multiplyAmountByCount(amount, 10);

    expect(result).toBe('12.5');
  });

  it('returns undefined for an empty amount', () => {
    const result = multiplyAmountByCount('', 10);

    expect(result).toBeUndefined();
  });

  it('returns undefined for a lone decimal point', () => {
    const result = multiplyAmountByCount('.', 10);

    expect(result).toBeUndefined();
  });

  it('returns undefined when count is zero', () => {
    const result = multiplyAmountByCount('120', 0);

    expect(result).toBeUndefined();
  });
});
