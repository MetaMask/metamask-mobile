import { isEvmCaip19AssetId } from './isEvmCaip19AssetId';

describe('isEvmCaip19AssetId', () => {
  it('returns true for an EVM CAIP-19 asset ID', () => {
    expect(isEvmCaip19AssetId('eip155:1/erc20:0x123')).toBe(true);
  });

  it('returns false for a non-EVM CAIP-19 asset ID', () => {
    expect(isEvmCaip19AssetId('solana:mainnet/slip44:501')).toBe(false);
  });

  it('returns false for an invalid asset ID', () => {
    expect(isEvmCaip19AssetId('not-a-caip-19-asset-id')).toBe(false);
  });
});
