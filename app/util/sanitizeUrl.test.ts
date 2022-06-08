import SanitizeUrl from './sanitizeUrl';

describe('SanitizeUrl', () => {
  it('should sanitize url', () => {
    const urlString = 'https://www.example.com/';
    const sanitizedUrl = SanitizeUrl(urlString);
    expect(sanitizedUrl).toEqual('https://www.example.com');
  });
});
