import stripProtocol from './stripProtocol';

describe('stripProtocol', () => {
  it('returns undefined if given undefined', () => {
    expect(stripProtocol(undefined)).toBeUndefined();
  });

  it('returns an empty string if given an empty string', () => {
    expect(stripProtocol('')).toBe('');
  });

  it('returns the host plus pathname of the URL, discarding everything else', () => {
    expect(stripProtocol('http://foo.com/bar?baz=qux')).toBe('foo.com/bar');
  });

  it('preserves subdomains', () => {
    expect(stripProtocol('http://foo.bar.com/baz?qux=bug')).toBe(
      'foo.bar.com/baz',
    );
  });

  it('returns a URL fragment without a path if it is just a slash', () => {
    expect(stripProtocol('http://foo.com/')).toBe('foo.com');
  });

  it('returns an invalid URL unchanged', () => {
    expect(stripProtocol('invalid URL')).toStrictEqual('invalid URL');
  });
});
