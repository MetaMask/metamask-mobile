import { parseCurrencyString } from './string';

describe('parseCurrencyString', () => {
  it('parses valid currency string', () => {
    const result = parseCurrencyString('$75.12');
    expect(result).toEqual(75.12);
  });

  it('parses out non-integer or non-decimal characters', () => {
    const result = parseCurrencyString(',[]{}()/?*&%$#@!312.12+=-_|;:');
    expect(result).toEqual(312.12);
  });

  it('parses out additional decimal places and retains all integer characters', () => {
    const result = parseCurrencyString('312..123.456');
    expect(result).toEqual(312.123456);
  });

  it('parses currency string when no decimal are present', () => {
    const result = parseCurrencyString('$312');
    expect(result).toEqual(312);
  });

  it('returns default value when str is empty string', () => {
    const result = parseCurrencyString('');
    expect(result).toEqual(0.0);
  });

  it('returns default value when str is undefined', () => {
    // @ts-expect-error forcing code path for test coverage
    const result = parseCurrencyString(undefined);
    expect(result).toEqual(0.0);
  });
});
