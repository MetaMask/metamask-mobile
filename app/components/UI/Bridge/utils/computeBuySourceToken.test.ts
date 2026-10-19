import {
  computeBuySourceToken,
  type BuySourceAsset,
} from './computeBuySourceToken';

const DESTINATION_CHAIN_ID = '0x1';
const DESTINATION_ADDRESS = '0x00000000000000000000000000000000000000ab';

const createAsset = (
  overrides: Partial<BuySourceAsset> = {},
): BuySourceAsset => ({
  assetId: '0x0000000000000000000000000000000000000002',
  chainId: DESTINATION_CHAIN_ID,
  decimals: 6,
  symbol: 'USDC',
  name: 'USD Coin',
  fiat: { balance: 100 },
  ...overrides,
});

describe('computeBuySourceToken', () => {
  it('selects the highest-fiat eligible asset on the destination chain', () => {
    const highestFiatAsset = createAsset({
      assetId: '0x0000000000000000000000000000000000000003',
      fiat: { balance: 500 },
    });
    const assets = {
      [DESTINATION_CHAIN_ID]: [
        createAsset({ fiat: { balance: 100 } }),
        highestFiatAsset,
      ],
    };

    const result = computeBuySourceToken(
      assets,
      DESTINATION_CHAIN_ID,
      DESTINATION_ADDRESS,
    );

    expect(result).toEqual({
      address: highestFiatAsset.assetId,
      chainId: DESTINATION_CHAIN_ID,
      decimals: highestFiatAsset.decimals,
      symbol: highestFiatAsset.symbol,
      name: highestFiatAsset.name,
      image: undefined,
    });
  });

  it('excludes the destination asset from same-chain selection', () => {
    const destinationAsset = createAsset({
      assetId: DESTINATION_ADDRESS,
      fiat: { balance: 1_000 },
    });
    const alternateAsset = createAsset({
      assetId: '0x0000000000000000000000000000000000000004',
      fiat: { balance: 100 },
    });

    const result = computeBuySourceToken(
      { [DESTINATION_CHAIN_ID]: [destinationAsset, alternateAsset] },
      DESTINATION_CHAIN_ID,
      DESTINATION_ADDRESS,
    );

    expect(result?.address).toBe(alternateAsset.assetId);
  });

  it('excludes a mixed-case destination address from same-chain selection', () => {
    const destinationAsset = createAsset({
      assetId: `0x${DESTINATION_ADDRESS.slice(2).toUpperCase()}`,
      fiat: { balance: 1_000 },
    });
    const alternateAsset = createAsset({
      assetId: '0x0000000000000000000000000000000000000004',
      fiat: { balance: 100 },
    });

    const result = computeBuySourceToken(
      { [DESTINATION_CHAIN_ID]: [destinationAsset, alternateAsset] },
      DESTINATION_CHAIN_ID,
      DESTINATION_ADDRESS,
    );

    expect(result?.address).toBe(alternateAsset.assetId);
  });

  it('prefers the highest-fiat native asset across other chains', () => {
    const nativeAsset = createAsset({
      assetId: '0x0000000000000000000000000000000000000005',
      chainId: '0x89',
      symbol: 'POL',
      name: 'POL',
      isNative: true,
      fiat: { balance: 100 },
    });
    const nonNativeAsset = createAsset({
      assetId: '0x0000000000000000000000000000000000000006',
      chainId: '0x89',
      fiat: { balance: 1_000 },
    });

    const result = computeBuySourceToken(
      { '0x89': [nonNativeAsset, nativeAsset] },
      DESTINATION_CHAIN_ID,
      DESTINATION_ADDRESS,
    );

    expect(result?.address).toBe(nativeAsset.assetId);
  });

  it('selects the highest-fiat native asset when native assets span chains', () => {
    const lowerFiatNativeAsset = createAsset({
      assetId: '0x0000000000000000000000000000000000000007',
      chainId: '0x89',
      symbol: 'POL',
      name: 'POL',
      isNative: true,
      fiat: { balance: 100 },
    });
    const higherFiatNativeAsset = createAsset({
      assetId: '0x0000000000000000000000000000000000000008',
      chainId: '0xa',
      symbol: 'ETH',
      name: 'Ether',
      isNative: true,
      fiat: { balance: 200 },
    });

    const result = computeBuySourceToken(
      { '0x89': [lowerFiatNativeAsset], '0xa': [higherFiatNativeAsset] },
      DESTINATION_CHAIN_ID,
      DESTINATION_ADDRESS,
    );

    expect(result?.address).toBe(higherFiatNativeAsset.assetId);
  });

  it('falls back to the highest-fiat non-native asset across other chains', () => {
    const higherFiatAsset = createAsset({
      assetId: '0x0000000000000000000000000000000000000009',
      chainId: '0x89',
      fiat: { balance: 800 },
    });

    const result = computeBuySourceToken(
      {
        '0x89': [
          createAsset({
            assetId: '0x000000000000000000000000000000000000000a',
            chainId: '0x89',
            fiat: { balance: 200 },
          }),
          higherFiatAsset,
        ],
      },
      DESTINATION_CHAIN_ID,
      DESTINATION_ADDRESS,
    );

    expect(result?.address).toBe(higherFiatAsset.assetId);
  });

  it('excludes assets rejected by the eligibility callback', () => {
    const rejectedAsset = createAsset({
      assetId: '0x000000000000000000000000000000000000000b',
      fiat: { balance: 1_000 },
      symbol: 'UNSUPPORTED',
    });
    const eligibleAsset = createAsset({
      assetId: '0x000000000000000000000000000000000000000c',
      fiat: { balance: 100 },
    });
    const isEligible = (asset: BuySourceAsset) =>
      asset.symbol !== 'UNSUPPORTED';

    const result = computeBuySourceToken(
      { [DESTINATION_CHAIN_ID]: [rejectedAsset, eligibleAsset] },
      DESTINATION_CHAIN_ID,
      DESTINATION_ADDRESS,
      isEligible,
    );

    expect(result?.address).toBe(eligibleAsset.assetId);
  });

  it('returns null when no eligible asset has positive fiat balance', () => {
    const result = computeBuySourceToken(
      {
        [DESTINATION_CHAIN_ID]: [
          createAsset({ fiat: { balance: 0 } }),
          createAsset({
            assetId: '0x000000000000000000000000000000000000000d',
            fiat: undefined,
          }),
        ],
      },
      DESTINATION_CHAIN_ID,
      DESTINATION_ADDRESS,
    );

    expect(result).toBeNull();
  });

  it('returns null for an undefined assets map', () => {
    const result = computeBuySourceToken(
      undefined,
      DESTINATION_CHAIN_ID,
      DESTINATION_ADDRESS,
    );

    expect(result).toBeNull();
  });
});
