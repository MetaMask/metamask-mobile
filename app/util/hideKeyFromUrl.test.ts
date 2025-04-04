import hideKeyFromUrl from './hideKeyFromUrl';

describe('hideKeyFromUrl', () => {
  it('should hide key from url', () => {
    const urlString = 'https://www.example.com/v1/1234556';
    const sanitizedUrl = hideKeyFromUrl(urlString);
    expect(sanitizedUrl).toEqual('https://www.example.com/v1');
  });

  it('should do nothing when url is undefined', () => {
    const urlString = undefined;
    const sanitizedUrl = hideKeyFromUrl(urlString);
    expect(sanitizedUrl).toEqual(undefined);
  });

  it('should return URL without change if there is no path', () => {
    const urlString = 'https://www.example.com';
    const sanitizedUrl = hideKeyFromUrl(urlString);
    expect(sanitizedUrl).toEqual('https://www.example.com');
  });

  it('should handle URLs with query parameters', () => {
    const urlString = 'https://www.example.com/v1/1234556?param=value';
    const sanitizedUrl = hideKeyFromUrl(urlString);
    expect(sanitizedUrl).toEqual('https://www.example.com/v1');
  });

  it('should handle URLs with fragments', () => {
    const urlString = 'https://www.example.com/v1/1234556#section';
    const sanitizedUrl = hideKeyFromUrl(urlString);
    expect(sanitizedUrl).toEqual('https://www.example.com/v1');
  });

  it('should return the same URL when there is a trailing slash', () => {
    const urlString = 'https://www.example.com/v1/';
    const sanitizedUrl = hideKeyFromUrl(urlString);
    expect(sanitizedUrl).toEqual('https://www.example.com/v1');
  });

  it('should handle a URL without a protocol', () => {
    const urlString = 'www.example.com/v1/1234';
    const sanitizedUrl = hideKeyFromUrl(urlString);
    expect(sanitizedUrl).toEqual('www.example.com/v1');
  });

  it('should handle URLs with multiple segments', () => {
    const urlString = 'https://www.example.com/v1/1234/5678';
    const sanitizedUrl = hideKeyFromUrl(urlString);
    expect(sanitizedUrl).toEqual('https://www.example.com/v1/1234');
  });

  it('should handle an empty string as the URL', () => {
    const urlString = '';
    const sanitizedUrl = hideKeyFromUrl(urlString);
    expect(sanitizedUrl).toEqual('');
  });

  it('should return the hostname if no path exists', () => {
    const urlString = 'https://www.example.com';
    const sanitizedUrl = hideKeyFromUrl(urlString);
    expect(sanitizedUrl).toEqual('https://www.example.com');
  });

  it('should handle URLs with only a single slash (root URL)', () => {
    const urlString = 'https://www.example.com/';
    const sanitizedUrl = hideKeyFromUrl(urlString);
    expect(sanitizedUrl).toEqual('https://www.example.com');
  });

  it('should not strip anything if the URL has only a single path segment', () => {
    const urlString = 'https://www.example.com/v1';
    const sanitizedUrl = hideKeyFromUrl(urlString);
    expect(sanitizedUrl).toEqual('https://www.example.com');
  });

  it('should strip the key when there are special characters in the URL', () => {
    const urlString = 'https://www.example.com/v1/123$%56';
    const sanitizedUrl = hideKeyFromUrl(urlString);
    expect(sanitizedUrl).toEqual('https://www.example.com/v1');
  });

  it('should handle localhost URLs', () => {
    const urlString = 'http://localhost:3000/v1/1234556';
    const sanitizedUrl = hideKeyFromUrl(urlString);
    expect(sanitizedUrl).toEqual('http://localhost:3000/v1');
  });

  it('should handle URLs with ports', () => {
    const urlString = 'https://www.example.com:8080/v1/1234556';
    const sanitizedUrl = hideKeyFromUrl(urlString);
    expect(sanitizedUrl).toEqual('https://www.example.com:8080/v1');
  });
});
