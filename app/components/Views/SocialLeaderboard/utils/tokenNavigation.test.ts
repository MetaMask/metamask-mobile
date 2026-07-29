import { parseAssetIdForNavigation } from './tokenNavigation';

describe('parseAssetIdForNavigation', () => {
  it('parses an EVM ERC-20 asset id to a hex chainId and contract address', () => {
    expect(
      parseAssetIdForNavigation(
        'eip155:8453/erc20:0x4200000000000000000000000000000000000006',
      ),
    ).toStrictEqual({
      chainId: '0x2105', // 8453
      address: '0x4200000000000000000000000000000000000006',
      isEvmChain: true,
      isNative: false,
    });
  });

  it('maps an EVM native (slip44) asset id to the zero address', () => {
    expect(parseAssetIdForNavigation('eip155:1/slip44:60')).toStrictEqual({
      chainId: '0x1',
      address: '0x0000000000000000000000000000000000000000',
      isEvmChain: true,
      isNative: true,
    });
  });

  it('keeps the CAIP chainId and full asset id for non-EVM chains', () => {
    const assetId =
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    expect(parseAssetIdForNavigation(assetId)).toStrictEqual({
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      address: assetId,
      isEvmChain: false,
      isNative: false,
    });
  });

  it('returns empty params for a non-CAIP asset id', () => {
    expect(parseAssetIdForNavigation('not-a-caip-asset')).toStrictEqual({
      chainId: '',
      address: '',
      isEvmChain: false,
      isNative: false,
    });
  });
});
