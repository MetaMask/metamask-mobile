import { assetIdsMatch } from '@metamask/bridge-controller';
import { getNetworkFeeAsset, type NetworkFeeAsset } from './getNetworkFeeAsset';

jest.mock('@metamask/bridge-controller', () => ({
  ...jest.requireActual('@metamask/bridge-controller'),
  assetIdsMatch: jest.fn(),
}));

const mockAsset: NetworkFeeAsset = {
  assetId: 'eip155:1/erc20:0xtoken',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  iconUrl: 'https://example.com/usdc.png',
};

type TxFee = NonNullable<Parameters<typeof getNetworkFeeAsset>[0]>[number];

const createTxFee = (asset: NetworkFeeAsset): TxFee => ({
  amount: '1',
  asset,
  maxFeePerGas: '1',
  maxPriorityFeePerGas: '1',
});

describe('getNetworkFeeAsset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(assetIdsMatch).mockReturnValue(true);
  });

  it('returns undefined when no transaction fees are provided', () => {
    expect(getNetworkFeeAsset(undefined)).toBeUndefined();
    expect(getNetworkFeeAsset([])).toBeUndefined();
  });

  it('returns undefined when the first fee asset is incomplete', () => {
    expect(
      getNetworkFeeAsset([
        createTxFee({
          ...mockAsset,
          symbol: '',
        }),
      ]),
    ).toBeUndefined();
  });

  it('returns the fee asset when all fees use the same asset', () => {
    const feeAsset = getNetworkFeeAsset([
      createTxFee(mockAsset),
      { ...createTxFee(mockAsset), amount: '2' },
    ]);

    expect(feeAsset).toBe(mockAsset);
    expect(assetIdsMatch).toHaveBeenCalledWith(
      mockAsset.assetId,
      mockAsset.assetId,
    );
  });

  it('fills in the icon URL when the fee asset has none', () => {
    expect(
      getNetworkFeeAsset([createTxFee({ ...mockAsset, iconUrl: undefined })])
        ?.iconUrl,
    ).toBe(
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xtoken.png',
    );
  });

  it('returns undefined when fees use different assets', () => {
    jest.mocked(assetIdsMatch).mockReturnValue(false);

    expect(
      getNetworkFeeAsset([
        createTxFee(mockAsset),
        {
          ...createTxFee({
            ...mockAsset,
            assetId: 'eip155:1/erc20:0xother',
          }),
          amount: '2',
        },
      ]),
    ).toBeUndefined();
  });
});
