import { buildTokenIconUrl } from './buildTokenIconUrl';

describe('buildTokenIconUrl', () => {
  it('should return empty string when chainId is not provided', () => {
    const result = buildTokenIconUrl(undefined, '0x1234567890abcdef');
    expect(result).toBe('');
  });

  it('should return empty string when address is not provided', () => {
    const result = buildTokenIconUrl('1', undefined);
    expect(result).toBe('');
  });

  it('should return empty string when both chainId and address are not provided', () => {
    const result = buildTokenIconUrl(undefined, undefined);
    expect(result).toBe('');
  });

  it('should return correct URL when chainId is a decimal string', () => {
    const chainId = '1';
    const address = '0x1234567890abcdef';
    const expected = `https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/${address}.png`;

    const result = buildTokenIconUrl(chainId, address);
    expect(result).toBe(expected);
  });

  it('should convert hex chainId to decimal and return correct URL', () => {
    const chainId = '0x1'; // hex for 1
    const address = '0x1234567890abcdef';
    const expected = `https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/${address}.png`;

    const result = buildTokenIconUrl(chainId, address);
    expect(result).toBe(expected);
  });

  it('should handle larger hex chainId values', () => {
    const chainId = '0x89'; // hex for 137 (Polygon)
    const address = '0xabcdef1234567890';
    const expected = `https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/137/erc20/${address}.png`;

    const result = buildTokenIconUrl(chainId, address);
    expect(result).toBe(expected);
  });

  it('should handle chainId with leading zeros', () => {
    const chainId = '0x01'; // hex for 1 with leading zero
    const address = '0x1234567890abcdef';
    const expected = `https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/${address}.png`;

    const result = buildTokenIconUrl(chainId, address);
    expect(result).toBe(expected);
  });

  it('should handle different address formats', () => {
    const chainId = '1';
    const address = '0xA0b86a33E6441C8bbA8418Db9f4aD4d0d0e01a23';
    const expected = `https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/${address.toLowerCase()}.png`;

    const result = buildTokenIconUrl(chainId, address);
    expect(result).toBe(expected);
  });

  it('should work with BSC mainnet', () => {
    const chainId = '56'; // BSC mainnet
    const address = '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82';
    const expected = `https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/56/erc20/${address.toLowerCase()}.png`;

    const result = buildTokenIconUrl(chainId, address);
    expect(result).toBe(expected);
  });

  it('should work with Arbitrum One', () => {
    const chainId = '0xa4b1'; // hex for 42161 (Arbitrum One)
    const address = '0x912CE59144191C1204E64559FE8253a0e49E6548';
    const expected = `https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/42161/erc20/${address.toLowerCase()}.png`;

    const result = buildTokenIconUrl(chainId, address);
    expect(result).toBe(expected);
  });
});
