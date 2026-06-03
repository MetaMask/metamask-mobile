import getDomain from './getDomain';

describe('getDomain', () => {
  it('returns the registrable domain for a multi-label hostname', () => {
    expect(getDomain('https://mainnet.infura.io/v3/abc')).toBe('infura.io');
  });

  it('groups subdomain-heavy hostnames under the same registrable domain', () => {
    expect(getDomain('https://linea-mainnet.infura.io/v3/abc')).toBe(
      'infura.io',
    );
    expect(getDomain('https://polygon-mainnet.g.alchemy.com/v2/abc')).toBe(
      'alchemy.com',
    );
  });

  it('returns the hostname as-is when it has exactly two labels', () => {
    expect(getDomain('https://alchemy.com/')).toBe('alchemy.com');
  });

  it('handles multi-part public suffixes like .co.uk', () => {
    expect(getDomain('https://api.example.co.uk/v1')).toBe('example.co.uk');
    expect(getDomain('https://example.co.uk/')).toBe('example.co.uk');
  });

  it('returns single-label hosts (e.g., localhost) verbatim', () => {
    expect(getDomain('http://localhost:8545')).toBe('localhost');
  });

  it('returns IPv4 addresses verbatim', () => {
    expect(getDomain('http://127.0.0.1:8545')).toBe('127.0.0.1');
  });

  it('returns IPv6 addresses verbatim, including brackets', () => {
    expect(getDomain('http://[::1]:8545')).toBe('[::1]');
  });

  it('returns null for an invalid URL', () => {
    expect(getDomain('not a url')).toBeNull();
  });
});
