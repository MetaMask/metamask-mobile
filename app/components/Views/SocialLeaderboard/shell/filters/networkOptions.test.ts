import { resolveNetworkForType } from './networkOptions';

describe('resolveNetworkForType', () => {
  it('keeps the current network when it is valid for the next type', () => {
    const result = resolveNetworkForType('tokens', 'solana');

    expect(result).toBe('solana');
  });

  it('resets to all when the current network is not valid for the next type', () => {
    const result = resolveNetworkForType('all', 'invalid' as 'solana');

    expect(result).toBe('all');
  });
});
