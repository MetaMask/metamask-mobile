import { chainNameToId, isSupportedChain } from './chainMapping';

describe('chainNameToId', () => {
  it.each([
    ['ethereum', '0x1'],
    ['base', '0x2105'],
    ['arbitrum', '0xa4b1'],
    ['optimism', '0xa'],
    ['polygon', '0x89'],
    ['linea', '0xe708'],
    ['bsc', '0x38'],
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
    expect(chainNameToId('ethereum')).toBe('0x1');
  });

  it('is case-insensitive for uppercase input', () => {
    expect(chainNameToId('ETHEREUM')).toBe('0x1');
  });

  it('is case-insensitive for mixed-case input', () => {
    expect(chainNameToId('Base')).toBe('0x2105');
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
