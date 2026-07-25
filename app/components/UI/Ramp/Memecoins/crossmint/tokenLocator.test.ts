import { CROSSMINT_STAGING_XMEME_TOKEN } from './constants';
import {
  crossmintChainToCaipChainId,
  mergeStagingXmeme,
  parseTokenLocator,
  toMemecoinToken,
} from './tokenLocator';

describe('tokenLocator helpers', () => {
  it('parses a token locator', () => {
    expect(
      parseTokenLocator('solana:7EivYFyNfgGj8xbUymR7J4LuxUHLKRzpLaERHLvi7Dgu'),
    ).toEqual({
      chain: 'solana',
      address: '7EivYFyNfgGj8xbUymR7J4LuxUHLKRzpLaERHLvi7Dgu',
    });
  });

  it('maps staging XMEME availability to known metadata', () => {
    expect(
      toMemecoinToken({
        token: CROSSMINT_STAGING_XMEME_TOKEN.tokenLocator,
        available: true,
        features: { creditCardPayment: true },
      }),
    ).toMatchObject({
      symbol: 'XMEME',
      name: 'XMEME',
      chain: 'solana',
    });
  });

  it('prepends staging XMEME when merging token lists', () => {
    const merged = mergeStagingXmeme([
      {
        tokenLocator: 'solana:other',
        chain: 'solana',
        address: 'other',
        available: true,
        creditCardPayment: true,
        name: 'OTHER',
        symbol: 'OTHER',
      },
    ]);

    expect(merged[0].symbol).toBe('XMEME');
    expect(merged).toHaveLength(2);
  });

  it('maps solana chain to MetaMask CAIP chain id', () => {
    expect(crossmintChainToCaipChainId('solana')).toBe(
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    );
  });
});
