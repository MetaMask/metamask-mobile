import { normalizeAssetIdForApi } from './normalizeAssetIdForApi';

describe('normalizeAssetIdForApi', () => {
  it('lowercases EIP-55 checksummed ERC-20 assetId on chain 1', () => {
    const checksummed =
      'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const lowercase =
      'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
    expect(normalizeAssetIdForApi(checksummed)).toBe(lowercase);
  });

  it('returns already-lowercase ERC-20 unchanged', () => {
    const lowercase =
      'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
    expect(normalizeAssetIdForApi(lowercase)).toBe(lowercase);
  });

  it('lowercases ERC-20 on non-mainnet EVM chains (Polygon, Base)', () => {
    const polygon =
      'eip155:137/erc20:0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
    const base = 'eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    expect(normalizeAssetIdForApi(polygon)).toBe(polygon.toLowerCase());
    expect(normalizeAssetIdForApi(base)).toBe(base.toLowerCase());
  });

  it('returns native EVM slip44 assetId unchanged', () => {
    const native = 'eip155:1/slip44:60';
    expect(normalizeAssetIdForApi(native)).toBe(native);
  });

  it('preserves case of Solana base58 mint addresses (non-EVM)', () => {
    const solana =
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm';
    expect(normalizeAssetIdForApi(solana)).toBe(solana);
  });

  it('returns empty string for undefined or empty input', () => {
    expect(normalizeAssetIdForApi(undefined)).toBe('');
    expect(normalizeAssetIdForApi('')).toBe('');
  });
});
