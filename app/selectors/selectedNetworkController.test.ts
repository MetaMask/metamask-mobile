import { selectNetworkClientIdForDomain } from './selectedNetworkController';

describe('selectNetworkClientIdForDomain', () => {
  it('returns the per-dapp network client when domains has the hostname', () => {
    const result = selectNetworkClientIdForDomain.resultFunc(
      { 'example.com': 'domain-client' },
      'selected-client',
      'example.com',
    );

    expect(result).toBe('domain-client');
  });

  it('falls back to the selected network client when the hostname has no domain entry', () => {
    const result = selectNetworkClientIdForDomain.resultFunc(
      {},
      'selected-client',
      'example.com',
    );

    expect(result).toBe('selected-client');
  });

  it('falls back to the selected network client when no hostname is provided', () => {
    const result = selectNetworkClientIdForDomain.resultFunc(
      { 'example.com': 'domain-client' },
      'selected-client',
      undefined,
    );

    expect(result).toBe('selected-client');
  });
});
