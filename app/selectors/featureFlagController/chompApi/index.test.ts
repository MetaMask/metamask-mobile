import { StructError } from '@metamask/superstruct';
import { parseChompApiConfig, selectChompApiBaseUrl } from './index';

describe('parseChompApiConfig', () => {
  it('returns undefined for undefined', () => {
    expect(parseChompApiConfig(undefined)).toBeUndefined();
  });

  it('returns undefined for null', () => {
    expect(parseChompApiConfig(null)).toBeUndefined();
  });

  it('parses a valid config', () => {
    expect(
      parseChompApiConfig({ baseUrl: 'https://example.com' }),
    ).toStrictEqual({ baseUrl: 'https://example.com' });
  });

  it('throws when baseUrl is missing', () => {
    expect(() => parseChompApiConfig({})).toThrow(StructError);
  });

  it('throws when baseUrl is not a string', () => {
    expect(() => parseChompApiConfig({ baseUrl: 42 })).toThrow(StructError);
  });

  it('throws when the value is not an object', () => {
    expect(() => parseChompApiConfig('not-an-object')).toThrow(StructError);
  });
});

describe('selectChompApiBaseUrl', () => {
  it('returns the base URL from the flag', () => {
    expect(
      selectChompApiBaseUrl.resultFunc({
        moneyAccountChompConfig: { baseUrl: 'https://example.com' },
      }),
    ).toBe('https://example.com');
  });

  it('returns undefined when the flag is not set', () => {
    expect(selectChompApiBaseUrl.resultFunc({})).toBeUndefined();
  });

  it('returns undefined when the flag is malformed', () => {
    expect(
      selectChompApiBaseUrl.resultFunc({ moneyAccountChompConfig: {} }),
    ).toBeUndefined();
  });
});
