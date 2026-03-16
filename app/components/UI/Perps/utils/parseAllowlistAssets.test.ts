import { parseAllowlistAssets } from './parseAllowlistAssets';

describe('parseAllowlistAssets', () => {
  it('parses comma-separated string and normalizes to lowercase', () => {
    expect(
      parseAllowlistAssets(
        '1.0xA0b86991c6218b36c1d19D4a2e9eb0ce3606eb48, 8453.0xABC ',
      ),
    ).toEqual(['1.0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', '8453.0xabc']);
  });

  it('parses array and normalizes with consistent strip-trim-lowercase', () => {
    expect(parseAllowlistAssets(['1.0xUSDC', ' 8453.0xweth '])).toEqual([
      '1.0xusdc',
      '8453.0xweth',
    ]);
  });

  it('returns empty array for invalid type (fallback to allow all)', () => {
    expect(parseAllowlistAssets(123)).toEqual([]);
    expect(parseAllowlistAssets(null)).toEqual([]);
    expect(parseAllowlistAssets(undefined)).toEqual([]);
  });

  it('returns empty array when array contains non-strings (fallback to allow all)', () => {
    expect(parseAllowlistAssets(['1.0xUSDC', 123, '8453.0xweth'])).toEqual([]);
  });

  it('filters out empty entries', () => {
    expect(parseAllowlistAssets('1.0xa,, 2.0xb ,  ')).toEqual([
      '1.0xa',
      '2.0xb',
    ]);
  });
});
