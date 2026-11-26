import { PERPS_CONSTANTS } from '@metamask/perps-controller';
import { convertPerpsAmountToUSD } from './amountConversion';

describe('convertPerpsAmountToUSD', () => {
  it('renders the placeholder, not $0, for an empty amount', () => {
    expect(convertPerpsAmountToUSD('')).toBe(
      PERPS_CONSTANTS.FallbackPriceDisplay,
    );
  });

  it('renders the placeholder, not $0, for an unparseable amount', () => {
    expect(convertPerpsAmountToUSD('abc')).toBe(
      PERPS_CONSTANTS.FallbackPriceDisplay,
    );
    expect(convertPerpsAmountToUSD('$abc')).toBe(
      PERPS_CONSTANTS.FallbackPriceDisplay,
    );
  });

  it('handles USD strings correctly', () => {
    expect(convertPerpsAmountToUSD('$10.32')).toBe('$10.32'); // Preserves decimals
    expect(convertPerpsAmountToUSD('$0.50')).toBe('$0.50'); // Preserves decimals
    expect(convertPerpsAmountToUSD('$1000')).toBe('$1,000');
  });

  it('handles hex wei values correctly', () => {
    // Hex wei is not supported in Perps flow: the amount is unknown
    expect(convertPerpsAmountToUSD('0xde0b6b3a7640000')).toBe(
      PERPS_CONSTANTS.FallbackPriceDisplay,
    );
  });

  it('handles numeric strings correctly', () => {
    expect(convertPerpsAmountToUSD('100')).toBe('$100');
    expect(convertPerpsAmountToUSD('0.5')).toBe('$0.50'); // Preserves decimals
    expect(convertPerpsAmountToUSD('1234.56')).toBe('$1,234.56'); // Preserves decimals
  });

  it('handles edge cases', () => {
    expect(convertPerpsAmountToUSD('0')).toBe('$0');
    expect(convertPerpsAmountToUSD('$0')).toBe('$0');
    expect(convertPerpsAmountToUSD('0x0')).toBe(
      PERPS_CONSTANTS.FallbackPriceDisplay,
    );
  });

  it('handles very small amounts', () => {
    // Very small wei amount (hex is unsupported)
    expect(convertPerpsAmountToUSD('0x1')).toBe(
      PERPS_CONSTANTS.FallbackPriceDisplay,
    );

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
