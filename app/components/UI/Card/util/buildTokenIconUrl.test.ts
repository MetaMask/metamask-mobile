import { buildTokenIconUrl } from './buildTokenIconUrl';

describe('buildTokenIconUrl', () => {
  it('returns empty string when chainId is not provided', () => {
    const result = buildTokenIconUrl(undefined, '0x1234567890abcdef');

    expect(result).toBe('');
  });

  it('returns empty string when address is not provided', () => {
    const result = buildTokenIconUrl('eip155:1', undefined);

    expect(result).toBe('');
  });

  it('returns empty string when both chainId and address are not provided', () => {
    const result = buildTokenIconUrl(undefined, undefined);

    expect(result).toBe('');
  });

  it('returns correct URL for Ethereum mainnet', () => {
    const chainId = 'eip155:1';
    const address = '0x1234567890abcdef';

    const result = buildTokenIconUrl(chainId, address);

    expect(result).toBe(
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0x1234567890abcdef.png',
    );
  });

  it('returns correct URL for Polygon', () => {
    const chainId = 'eip155:137';
    const address = '0xabcdef1234567890';

    const result = buildTokenIconUrl(chainId, address);

    expect(result).toBe(
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/137/erc20/0xabcdef1234567890.png',
    );
  });

  it('converts address to lowercase for EVM chains', () => {
    const chainId = 'eip155:1';
    const address = '0xA0b86a33E6441C8bbA8418Db9f4aD4d0d0e01a23';

    const result = buildTokenIconUrl(chainId, address);

    expect(result).toBe(
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xa0b86a33e6441c8bba8418db9f4ad4d0d0e01a23.png',
    );
  });

  it('returns correct URL for BSC mainnet', () => {
    const chainId = 'eip155:56';
    const address = '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82';

    const result = buildTokenIconUrl(chainId, address);

    expect(result).toBe(
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/56/erc20/0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82.png',
    );
  });

  it('returns correct URL for Arbitrum One', () => {
    const chainId = 'eip155:42161';
    const address = '0x912CE59144191C1204E64559FE8253a0e49E6548';

    const result = buildTokenIconUrl(chainId, address);

    expect(result).toBe(
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/42161/erc20/0x912ce59144191c1204e64559fe8253a0e49e6548.png',
    );
  });

  describe('Solana chains', () => {
    it('returns correct URL for Solana mainnet', () => {
      const chainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
      const address = 'So11111111111111111111111111111111111111112';

      const result = buildTokenIconUrl(chainId, address);

      expect(result).toBe(
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token/So11111111111111111111111111111111111111112.png',
      );
    });

    it('preserves original case for Solana token address', () => {
      const chainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
      const address = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

      const result = buildTokenIconUrl(chainId, address);

      expect(result).toBe(
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v.png',
      );
    });

    it('uses solana network prefix and token type for Solana chains', () => {
      const chainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
      const address = 'So11111111111111111111111111111111111111112';

      const result = buildTokenIconUrl(chainId, address);

      expect(result).toContain('/solana/');
      expect(result).toContain('/token/');
      expect(result).not.toContain('/eip155/');
      expect(result).not.toContain('/erc20/');
    });

    it('removes solana prefix from chainId in URL', () => {
      const chainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
      const address = 'So11111111111111111111111111111111111111112';

      const result = buildTokenIconUrl(chainId, address);

      expect(result).toContain('/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/');
      expect(result).not.toContain('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp');
    });
  });
});
