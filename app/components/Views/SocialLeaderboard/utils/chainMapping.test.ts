import { chainNameToId, isSupportedChain } from './chainMapping';

describe('chainNameToId', () => {
  it.each([
    ['ethereum', 'eip155:1'],
    ['base', 'eip155:8453'],
    ['arbitrum', 'eip155:42161'],
    ['optimism', 'eip155:10'],
    ['polygon', 'eip155:137'],
    ['linea', 'eip155:59144'],
    ['bsc', 'eip155:56'],
    ['solana', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
  ])('maps %s to %s', (chainName, expectedId) => {
    expect(chainNameToId(chainName)).toBe(expectedId);
  });

  it('returns undefined for an unsupported chain name', () => {
    expect(chainNameToId('avalanche')).toBeUndefined();
  });

  it('returns undefined for an empty string', () => {
    expect(chainNameToId('')).toBeUndefined();
  });

  it('is case-insensitive for lowercase input', () => {
    expect(chainNameToId('ethereum')).toBe('eip155:1');
  });

  it('is case-insensitive for uppercase input', () => {
    expect(chainNameToId('ETHEREUM')).toBe('eip155:1');
  });

  it('is case-insensitive for mixed-case input', () => {
    expect(chainNameToId('Base')).toBe('eip155:8453');
  });
});

describe('isSupportedChain', () => {
  it('returns true for a known chain', () => {
    expect(isSupportedChain('ethereum')).toBe(true);
  });

  it('returns true for all supported chains', () => {
    const supported = [
      'ethereum',
      'base',
      'arbitrum',
      'optimism',
      'polygon',
      'linea',
      'bsc',
      'solana',
    ];
    supported.forEach((chain) => {
      expect(isSupportedChain(chain)).toBe(true);
    });
  });

  it('returns false for an unknown chain', () => {
    expect(isSupportedChain('avalanche')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isSupportedChain('')).toBe(false);
  });

  it('is case-insensitive — returns true for uppercase input', () => {
    expect(isSupportedChain('ETHEREUM')).toBe(true);
  });

  it('is case-insensitive — returns true for mixed-case input', () => {
    expect(isSupportedChain('BASE')).toBe(true);
  });
});
