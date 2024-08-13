import hideProtocolFromUrl from './hideProtocolFromUrl';

describe('hideProtocolFromUrl', () => {
  it('should return undefined for undefined input', () => {
    expect(hideProtocolFromUrl(undefined)).toBeUndefined();
  });

  it('should return an empty string for an empty string input', () => {
    expect(hideProtocolFromUrl('')).toBe('');
  });

  it('should remove http protocol from URL', () => {
    const url = 'http://example.com';
    const expected = 'example.com';
    expect(hideProtocolFromUrl(url)).toBe(expected);
  });

  it('should remove https protocol from URL', () => {
    const url = 'https://example.com';
    const expected = 'example.com';
    expect(hideProtocolFromUrl(url)).toBe(expected);
  });

  it('should return the URL as is if it does not start with http or https', () => {
    const url = 'ftp://example.com';
    expect(hideProtocolFromUrl(url)).toBe(url);
  });

  it('should handle URLs with subdomains correctly', () => {
    const url = 'https://www.example.com';
    const expected = 'www.example.com';
    expect(hideProtocolFromUrl(url)).toBe(expected);
  });

  it('should handle URLs with paths, query parameters, and anchors correctly', () => {
    const url = 'https://example.com/path?query=123#anchor';
    const expected = 'example.com/path?query=123#anchor';
    expect(hideProtocolFromUrl(url)).toBe(expected);
  });

  it('should return the URL as is if it does not contain a protocol', () => {
    const url = 'example.com';
    expect(hideProtocolFromUrl(url)).toBe(url);
  });
});
