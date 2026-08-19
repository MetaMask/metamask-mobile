import { getUsdAmountRange } from './usdAmountRange';

describe('getUsdAmountRange', () => {
  describe('numeric input', () => {
    it.each([
      [undefined, '< 0.01'],
      [0, '< 0.01'],
      [0.005, '< 0.01'],
      [0.01, '0.01 - 0.99'],
      [0.5, '0.01 - 0.99'],
      [0.99, '0.01 - 0.99'],
      [1.0, '1.00 - 9.99'],
      [9.99, '1.00 - 9.99'],
      [10.0, '10.00 - 99.99'],
      [99.99, '10.00 - 99.99'],
      [100.0, '100.00 - 999.99'],
      [999.99, '100.00 - 999.99'],
      [1000.0, '1000.00+'],
      [9999.0, '1000.00+'],
    ] as [number | undefined, string][])(
      'maps %s to "%s"',
      (amount, expected) => {
        expect(getUsdAmountRange(amount)).toBe(expected);
      },
    );
  });

  describe('string input (Merkl reward format)', () => {
    it.each([
      ['< 0.01', '< 0.01'],
      ['<0.005', '< 0.01'],
      ['0.50', '0.01 - 0.99'],
      ['0.99', '0.01 - 0.99'],
      ['1.00', '1.00 - 9.99'],
      ['9.99', '1.00 - 9.99'],
      ['10.00', '10.00 - 99.99'],
      ['99.99', '10.00 - 99.99'],
      ['100.00', '100.00 - 999.99'],
      ['999.99', '100.00 - 999.99'],
      ['1000.00', '1000.00+'],
      ['9999.00', '1000.00+'],
    ] as [string, string][])('maps "%s" to "%s"', (amount, expected) => {
      expect(getUsdAmountRange(amount)).toBe(expected);
    });
  });
});
