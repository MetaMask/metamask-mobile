import {
  finalizeNumericTextInput,
  normalizeNumericTextInput,
} from './normalizeNumericTextInput';

describe('normalizeNumericTextInput', () => {
  it.each([
    ['012', '12'],
    ['00.5', '0.5'],
    ['.', '0.'],
    ['12.', '12.'],
    ['000', '0'],
    ['0000000001', '1'],
  ])('normalizes %s to %s', (text, expectedValue) => {
    const previousValue = '7';

    const result = normalizeNumericTextInput(text, previousValue);

    expect(result).toEqual({ value: expectedValue, ok: true });
  });

  it('accepts an empty native input value', () => {
    const previousValue = '1';

    const result = normalizeNumericTextInput('', previousValue);

    expect(result).toEqual({ value: '', ok: true });
  });

  it.each(['1.2.3', '1..2', '..1'])(
    'rejects repeated decimal separators in %s',
    (text) => {
      const previousValue = '1.2';

      const result = normalizeNumericTextInput(text, previousValue);

      expect(result).toEqual({ value: previousValue, ok: false });
    },
  );

  it('rejects repeated configured decimal separators', () => {
    const previousValue = '1,2';

    const result = normalizeNumericTextInput('1,2,3', previousValue, {
      decimalSeparator: ',',
    });

    expect(result).toEqual({ value: previousValue, ok: false });
  });

  it('rejects text containing non-numeric characters', () => {
    const previousValue = '12';

    const result = normalizeNumericTextInput('12a', previousValue);

    expect(result).toEqual({ value: previousValue, ok: false });
  });

  it('rejects edits exceeding the default digit limit', () => {
    const previousValue = '123456789';

    const result = normalizeNumericTextInput('1234567890', previousValue);

    expect(result).toEqual({ value: previousValue, ok: false });
  });

  it('accepts edits at a configured digit limit', () => {
    const previousValue = '';

    const result = normalizeNumericTextInput('1234.56', previousValue, {
      maxDigits: 6,
    });

    expect(result).toEqual({ value: '1234.56', ok: true });
  });

  it('rejects edits exceeding the fractional digit limit', () => {
    const previousValue = '1.23';

    const result = normalizeNumericTextInput('1.234', previousValue, {
      maxDecimalPlaces: 2,
    });

    expect(result).toEqual({ value: previousValue, ok: false });
  });

  it('rejects a decimal separator when fractional digits are disabled', () => {
    const previousValue = '1';

    const result = normalizeNumericTextInput('1.', previousValue, {
      maxDecimalPlaces: 0,
    });

    expect(result).toEqual({ value: previousValue, ok: false });
  });

  it('normalizes input with a configured decimal separator', () => {
    const previousValue = '';

    const result = normalizeNumericTextInput('00,5', previousValue, {
      decimalSeparator: ',',
    });

    expect(result).toEqual({ value: '0,5', ok: true });
  });
});

describe('finalizeNumericTextInput', () => {
  it.each([
    ['12.', '12'],
    ['0.', '0'],
    ['', ''],
    ['12.3', '12.3'],
  ])('finalizes %s to %s', (value, expectedValue) => {
    const decimalSeparator = '.';

    const result = finalizeNumericTextInput(value, decimalSeparator);

    expect(result).toBe(expectedValue);
  });
});
