import { assetIdsMatch } from '@metamask/bridge-controller';
import { getGaslessFeeAsset } from './getGaslessFeeAsset';

jest.mock('@metamask/bridge-controller', () => ({
  ...jest.requireActual('@metamask/bridge-controller'),
  assetIdsMatch: jest.fn(),
}));

const mockAsset = {
  assetId: 'eip155:1/erc20:0xtoken',
  symbol: 'USDC',
  iconUrl: 'https://example.com/usdc.png',
};

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
        { amount: '1', asset: { assetId: mockAsset.assetId } },
      ]),
    ).toBeUndefined();
  });

  it('returns the fee asset when all fees use the same asset', () => {
    const feeAsset = getGaslessFeeAsset([
      { amount: '1', asset: mockAsset },
      { amount: '2', asset: mockAsset },
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
        { amount: '1', asset: mockAsset },
        {
          amount: '2',
          asset: { ...mockAsset, assetId: 'eip155:1/erc20:0xother' },
        },
      ]),
    ).toBeUndefined();
  });
});
