import { convertPerpsAmountToUSD } from './amountConversion';

describe('convertPerpsAmountToUSD', () => {
  it('handles empty or null input', () => {
    expect(convertPerpsAmountToUSD('')).toBe('$0');
    expect(convertPerpsAmountToUSD(null as unknown as string)).toBe('$0');
    expect(convertPerpsAmountToUSD(undefined as unknown as string)).toBe('$0');
  });

  it('handles USD strings correctly', () => {
    expect(convertPerpsAmountToUSD('$10.32')).toBe('$10.32'); // Preserves decimals
    expect(convertPerpsAmountToUSD('$0.50')).toBe('$0.50'); // Preserves decimals
    expect(convertPerpsAmountToUSD('$1000')).toBe('$1,000');
  });

  it('handles hex wei values correctly', () => {
    // 1 ETH in wei (0xde0b6b3a7640000)
    expect(convertPerpsAmountToUSD('0xde0b6b3a7640000')).toBe('$20,000');
  });

  it('handles numeric strings correctly', () => {
    expect(convertPerpsAmountToUSD('100')).toBe('$100');
    expect(convertPerpsAmountToUSD('0.5')).toBe('$0.50'); // Preserves decimals
    expect(convertPerpsAmountToUSD('1234.56')).toBe('$1,234.56'); // Preserves decimals
  });

  it('handles edge cases', () => {
    expect(convertPerpsAmountToUSD('0')).toBe('$0');
    expect(convertPerpsAmountToUSD('$0')).toBe('$0');
    expect(convertPerpsAmountToUSD('0x0')).toBe('$0');
  });

  it('handles very small amounts', () => {
    // Very small wei amount
    expect(convertPerpsAmountToUSD('0x1')).toBe('$0');

    // Very small decimal - gets threshold formatting from formatPerpsFiat
    expect(convertPerpsAmountToUSD('0.001')).toBe('<$0.01');
  });

  it('handles very large amounts', () => {
    // Large numeric string
    expect(convertPerpsAmountToUSD('1000000')).toBe('$1,000,000');

    // Large USD string
    expect(convertPerpsAmountToUSD('$1000000')).toBe('$1,000,000');
  });

  it('preserves decimal amounts correctly', () => {
    // Test various decimal values to ensure they preserve decimals
    expect(convertPerpsAmountToUSD('$10.02')).toBe('$10.02');
    expect(convertPerpsAmountToUSD('$10.99')).toBe('$10.99');
    expect(convertPerpsAmountToUSD('$0.99')).toBe('$0.99');
    expect(convertPerpsAmountToUSD('$999.99')).toBe('$999.99');
    expect(convertPerpsAmountToUSD('10.02')).toBe('$10.02');
    expect(convertPerpsAmountToUSD('10.99')).toBe('$10.99');
    expect(convertPerpsAmountToUSD('0.99')).toBe('$0.99');
    expect(convertPerpsAmountToUSD('999.99')).toBe('$999.99');
    // Test the specific bug case: $2.30 withdrawal showing $1.30
    expect(convertPerpsAmountToUSD('1.30')).toBe('$1.30');
  });
});
