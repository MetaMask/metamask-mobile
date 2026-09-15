import { assetIdsMatch } from '@metamask/bridge-controller';
import { getGaslessFeeAsset } from './getGaslessFeeAsset';

jest.mock('@metamask/bridge-controller', () => ({
  ...jest.requireActual('@metamask/bridge-controller'),
  assetIdsMatch: jest.fn(),
}));

interface MockAsset {
  assetId: `${string}:${string}/${string}:${string}`;
  symbol: string;
  name: string;
  decimals: number;
  iconUrl: string;
}

const mockAsset: MockAsset = {
  assetId: 'eip155:1/erc20:0xtoken',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  iconUrl: 'https://example.com/usdc.png',
};

type TxFee = NonNullable<Parameters<typeof getGaslessFeeAsset>[0]>[number];

const createTxFee = (asset: MockAsset): TxFee => ({
  amount: '1',
  asset,
  maxFeePerGas: '1',
  maxPriorityFeePerGas: '1',
});

describe('getGaslessFeeAsset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(assetIdsMatch).mockReturnValue(true);
  });

  it('returns undefined when no transaction fees are provided', () => {
    expect(getGaslessFeeAsset(undefined)).toBeUndefined();
    expect(getGaslessFeeAsset([])).toBeUndefined();
  });

  it('returns undefined when the first fee asset is incomplete', () => {
    expect(
      getGaslessFeeAsset([
        createTxFee({
          ...mockAsset,
          assetId: undefined,
          symbol: '',
        } as unknown as MockAsset),
      ]),
    ).toBeUndefined();
  });

  it('returns the fee asset when all fees use the same asset', () => {
    const feeAsset = getGaslessFeeAsset([
      createTxFee(mockAsset),
      { ...createTxFee(mockAsset), amount: '2' },
    ]);

    expect(feeAsset).toBe(mockAsset);
    expect(assetIdsMatch).toHaveBeenCalledWith(
      mockAsset.assetId,
      mockAsset.assetId,
    );
  });

  it('returns undefined when fees use different assets', () => {
    jest.mocked(assetIdsMatch).mockReturnValue(false);

    expect(
      getGaslessFeeAsset([
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
