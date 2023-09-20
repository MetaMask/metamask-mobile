import {
  capitalize,
  tlc,
  toLowerCaseEquals,
  renderShortText,
  getURLProtocol,
  isIPFSUri,
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
  const o = {
    p: undefined,
  };
  it('should coerce a string toLowerCase', () => {
    expect(tlc('aBCDefH')).toEqual('abcdefh');
    expect(tlc(NaN)).toEqual(undefined);
    expect(tlc(o.p)).toEqual(undefined);
  });
});

describe('toLowerCaseEquals', () => {
  const o = {
    p: undefined,
  };
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
  it('should return https for https urls', () => {
    expect(getURLProtocol('https://metamask.io/')).toBe('https');
  });
  it('should return http for http urls', () => {
    expect(getURLProtocol('http://metamask.io/')).toBe('http');
  });
  it('should return ftp for ftp urls', () => {
    expect(getURLProtocol('ftp://metamask.io/')).toBe('ftp');
  });
  it('should return an empty string for a random string', () => {
    expect(getURLProtocol('wjidnciewncie')).toBe('');
  });
  it('should return an empty string for an empty string', () => {
    expect(getURLProtocol('')).toBe('');
  });
});

describe('isIPFSUri', () => {
  it('should return true for valid IPFS URIs', () => {
    // Test valid IPFS URIs
    expect(
      isIPFSUri('/ipfs/QmRbcHJcY9t2B2bbE7EcPp17FmkygJ7uk5b8wLhtT96fbR'),
    ).toBe(true);
    expect(
      isIPFSUri('ipfs://QmRbcHJcY9t2B2bbE7EcPp17FmkygJ7uk5b8wLhtT96fbR/'),
    ).toBe(true);
    expect(
      isIPFSUri(
        '/ipfs/bafybeigllpyr3xmfqjnj7pywsdzct4jrbo2xt3ie3dwyfif7h4pnks5ar4',
      ),
    ).toBe(true);
    expect(
      isIPFSUri(
        'ipfs://QmT76MYkBGwPosYqjrP7S42kQvm5eU2buSS9NvTzZ61FLT/image.gif',
      ),
    ).toBe(true);
    expect(isIPFSUri('ipfs://')).toBe(true);
  });

  it('should return false for invalid IPFS URIs', () => {
    // Test invalid IPFS URIs and other non-IPFS URIs
    expect(
      isIPFSUri(
        '/ipfsmalformed/QmRbcHJcY9t2B2bbE7EcPp17FmkygJ7uk5b8wLhtT96fbR',
      ),
    ).toBe(false);
    expect(isIPFSUri('https://example.com')).toBe(false);
    expect(isIPFSUri('ftp://example.com')).toBe(false);
    expect(isIPFSUri('/ipfs')).toBe(false);
  });

  it('should return false for undefined or null', () => {
    // Test undefined and null values
    expect(isIPFSUri(undefined)).toBe(false);
    expect(isIPFSUri(null)).toBe(false);
  });
});
