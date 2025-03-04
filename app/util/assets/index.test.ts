import { formatWithThreshold } from '.';

describe('formatWithThreshold', () => {
  const enUSCurrencyOptions = { style: 'currency', currency: 'USD' };
  const enEUCurrencyOptions = { style: 'currency', currency: 'EUR' };
  const jpYenCurrencyOptions = { style: 'currency', currency: 'JPY' };
  const numberOptions = { maximumFractionDigits: 2 };

  const cryptoOptions = {
    minimumFractionDigits: 0,
    maximumFractionDigits: 5,
  };

  test('returns an empty string when amount is null', () => {
    expect(formatWithThreshold(null, 10, 'en-US', enUSCurrencyOptions)).toBe(
      '',
    );
  });

  test('formats zero correctly in en-US currency format', () => {
    expect(formatWithThreshold(0, 10, 'en-US', enUSCurrencyOptions)).toBe(
      '$0.00',
    );
  });

  test('ensures USD currency format does not result in 1 decimal place', () => {
    expect(formatWithThreshold(5.1, 0, 'en-US', enUSCurrencyOptions)).toBe(
      '$5.10',
    );
  });

  test('formats amount below threshold correctly with "<" notation', () => {
    expect(formatWithThreshold(5, 10, 'en-US', enUSCurrencyOptions)).toBe(
      '<$10.00',
    );
  });

  test('formats amount above threshold correctly', () => {
    expect(formatWithThreshold(15, 10, 'en-US', enUSCurrencyOptions)).toBe(
      '$15.00',
    );
  });

  test('supports EUR formatting correctly', () => {
    expect(formatWithThreshold(5, 10, 'de-DE', enEUCurrencyOptions)).toBe(
      '<10,00\xa0€',
    );
  });

  test('supports JPY formatting correctly (no decimal places)', () => {
    expect(formatWithThreshold(100, 500, 'ja-JP', jpYenCurrencyOptions)).toBe(
      '<￥500',
    );
  });

  test('formats correctly when the threshold is exactly the same as the amount', () => {
    expect(formatWithThreshold(10, 10, 'en-US', enUSCurrencyOptions)).toBe(
      '$10.00',
    );
  });

  test('handles high precision numbers correctly with currency format', () => {
    expect(
      formatWithThreshold(1234.567, 1000, 'en-US', enUSCurrencyOptions),
    ).toBe('$1,234.57');
  });

  test('handles different locale number formatting without currency', () => {
    expect(formatWithThreshold(1234.56, 1000, 'fr-FR', numberOptions)).toBe(
      '1\u202f234,56',
    );
  });

  // Crypto-specific tests
  test('formats ETH correctly when below threshold', () => {
    expect(formatWithThreshold(0.000009, 0.00001, 'en-US', cryptoOptions)).toBe(
      '<0.00001',
    );
  });

  test('formats ETH correctly when above threshold', () => {
    expect(formatWithThreshold(0.005432, 0.00001, 'en-US', cryptoOptions)).toBe(
      '0.00543',
    );
  });

  test('formats SOL correctly when below threshold', () => {
    expect(formatWithThreshold(0.000009, 0.00001, 'en-US', cryptoOptions)).toBe(
      '<0.00001',
    );
  });

  test('formats SOL correctly when above threshold', () => {
    expect(formatWithThreshold(1.234567, 0.00001, 'en-US', cryptoOptions)).toBe(
      '1.23457',
    );
  });

  test('formats BTC correctly when below threshold', () => {
    expect(
      formatWithThreshold(0.0000009, 0.00001, 'en-US', cryptoOptions),
    ).toBe('<0.00001');
  });

  test('formats BTC correctly when above threshold', () => {
    expect(formatWithThreshold(0.012345, 0.00001, 'en-US', cryptoOptions)).toBe(
      '0.01235',
    );
  });
});
