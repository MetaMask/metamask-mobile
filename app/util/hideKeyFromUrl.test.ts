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
});
