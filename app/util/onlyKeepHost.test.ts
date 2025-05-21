import onlyKeepHost from './onlyKeepHost';

describe('onlyKeepHost', () => {
  it('returns only the host of the URL and drops everything else', () => {
    expect(onlyKeepHost('http://foo.com/bar')).toStrictEqual('foo.com');
  });

  it('preserves subdomains', () => {
    expect(onlyKeepHost('http://foo.bar.com/baz')).toStrictEqual('foo.bar.com');
  });

  it('returns an invalid URL unchanged', () => {
    expect(onlyKeepHost('invalid URL')).toStrictEqual('invalid URL');
  });
});
