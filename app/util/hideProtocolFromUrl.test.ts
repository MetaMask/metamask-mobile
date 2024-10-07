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
    const url = 'example.com';
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

  // New tests for additional coverage

  it('should handle URLs with ports correctly', () => {
    const url = 'http://example.com:8080';
    const expected = 'example.com:8080';
    expect(hideProtocolFromUrl(url)).toBe(expected);
  });

  it('should handle URLs with credentials correctly', () => {
    const url = 'https://user:password@example.com';
    const expected = 'example.com';
    expect(hideProtocolFromUrl(url)).toBe(expected);
  });

  it('should handle URLs with paths without removing anything but the protocol', () => {
    const url = 'https://example.com/path/to/resource';
    const expected = 'example.com/path/to/resource';
    expect(hideProtocolFromUrl(url)).toBe(expected);
  });

  it('should handle URLs with unusual characters in the path or query', () => {
    const url = 'https://example.com/path-with-unusual-characters/!@#$%^&*()';
    const expected = 'example.com/path-with-unusual-characters/!@#$%^&*()';
    expect(hideProtocolFromUrl(url)).toBe(expected);
  });

  it('should return the original URL if it is malformed', () => {
    const url = '://malformed-url.com';
    expect(hideProtocolFromUrl(url)).toBe(url);
  });

  it('should return the URL as is if it contains a non-standard protocol', () => {
    const url = 'ftp://example.com';
    expect(hideProtocolFromUrl(url)).toBe('example.com');
  });

  it('should handle URLs with fragments only', () => {
    const url = 'https://example.com#section';
    const expected = 'example.com#section';
    expect(hideProtocolFromUrl(url)).toBe(expected);
  });

  it('should handle URLs with query parameters only', () => {
    const url = 'https://example.com?query=value';
    const expected = 'example.com?query=value';
    expect(hideProtocolFromUrl(url)).toBe(expected);
  });

  it('should handle URLs with both query parameters and fragments', () => {
    const url = 'https://example.com/path?query=123#section';
    const expected = 'example.com/path?query=123#section';
    expect(hideProtocolFromUrl(url)).toBe(expected);
  });
});
