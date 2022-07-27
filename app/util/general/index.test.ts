import {
  capitalize,
  tlc,
  toLowerCaseEquals,
  renderShortText,
  isValidUrl,
} from '.';

describe('capitalize', () => {
  const my_string = 'string';
  it('should capitalize a string', () => {
    expect(capitalize(my_string)).toEqual('String');
  });
  it('should return false if a string is not provided', () => {
    expect(capitalize(null)).toEqual(false);
  });
});

describe('tlc', () => {
  const o = {};
  it('should coerce a string toLowerCase', () => {
    expect(tlc('aBCDefH')).toEqual('abcdefh');
    expect(tlc(NaN)).toEqual(undefined);
    expect(tlc(o.p)).toEqual(undefined);
  });
});

describe('toLowerCaseEquals', () => {
  const o = {};
  it('compares two things', () => {
    expect(toLowerCaseEquals('A', 'A')).toEqual(true);
    expect(toLowerCaseEquals('aBCDefH', 'abcdefh')).toEqual(true);
    expect(toLowerCaseEquals('A', 'B')).toEqual(false);
    expect(toLowerCaseEquals('aBCDefH', 'abcdefi')).toEqual(false);
    // cases where a or b are undefined
    expect(toLowerCaseEquals(o.p, 'A')).toEqual(false);
    expect(toLowerCaseEquals('A', o.p)).toEqual(false);
    expect(toLowerCaseEquals(undefined, 'A')).toEqual(false);
    expect(toLowerCaseEquals('A', undefined)).toEqual(false);
    // case where a and b are both undefined, null or false
    expect(toLowerCaseEquals(undefined, undefined)).toEqual(false);
    expect(toLowerCaseEquals(null, null)).toEqual(false);
    expect(toLowerCaseEquals(false, false)).toEqual(false);
  });
});

describe('renderShortText', () => {
  it('should return a shorter version of the text', () => {
    const input = '123456789';
    const expectedOutput = '123...9';
    expect(renderShortText(input, 1)).toStrictEqual(expectedOutput);
  });

  it('should return the same text if the shorter version has the same length or bigger', () => {
    const input = '123456789';
    expect(renderShortText(input, 2)).toStrictEqual(input);
  });
});

describe('isValidUrl', () => {
  it('should be valid for https urls', () => {
    expect(isValidUrl('https://metamask.io/')).toBe(true);
  });
  it('should be valid for http urls', () => {
    expect(isValidUrl('http://metamask.io/')).toBe(true);
  });
  it('should be valid for ftp urls', () => {
    expect(isValidUrl('ftp://metamask.io/')).toBe(true);
  });
  it('should not be  valid for random string', () => {
    expect(isValidUrl('wjidnciewncie')).toBe(false);
  });
  it('should not be  valid for empty string', () => {
    expect(isValidUrl('')).toBe(false);
  });
  it('should not be  valid for undefined', () => {
    expect(isValidUrl(undefined)).toBe(false);
  });
});
