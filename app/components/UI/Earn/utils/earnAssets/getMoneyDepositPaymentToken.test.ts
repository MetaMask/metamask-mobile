import type { Asset } from '@metamask/assets-controllers';
import { EthAccountType } from '@metamask/keyring-api';
import type { EarnAsset, EarnAssetId } from '../../types/earnAssets';
import { requireTrackedEarnAsset } from './requireTrackedEarnAsset';
import { getMoneyDepositPaymentToken } from './getMoneyDepositPaymentToken';

jest.mock('./requireTrackedEarnAsset', () => ({
  requireTrackedEarnAsset: jest.fn(),
}));

const ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const ASSET_ID = `eip155:1/erc20:${ADDRESS}` as EarnAssetId;
const mockRequireTrackedEarnAsset = jest.mocked(requireTrackedEarnAsset);

const createEarnAsset = (wallet: EarnAsset['wallet']): EarnAsset => ({
  assetId: ASSET_ID,
  metadata: {
    address: ADDRESS,
    chainId: '0x1',
    decimals: 6,
    image: 'usdc.png',
    name: 'USD Coin',
    symbol: 'USDC',
    logo: 'usdc.png',
    isETH: false,
  },
  wallet,
  experiences: [],
});

const createWalletAsset = (): Asset =>
  ({
    accountType: EthAccountType.Eoa,
    accountId: 'account-id',
    assetId: ADDRESS,
    address: ADDRESS,
    chainId: '0x1',
    decimals: 6,
    image: 'usdc.png',
    name: 'USD Coin',
    symbol: 'USDC',
    balance: '10',
    rawBalance: '0x989680',
    fiat: { balance: 10, currency: 'USD', conversionRate: 1 },
    isNative: false,
  }) as Asset;

describe('getMoneyDepositPaymentToken', () => {
  beforeEach(() => {
    mockRequireTrackedEarnAsset.mockReset();
  });

  it('returns the tracked wallet asset address and chain ID', () => {
    const walletAsset = createWalletAsset();
    const earnAsset = createEarnAsset({
      status: 'tracked',
      asset: walletAsset,
    });
    mockRequireTrackedEarnAsset.mockReturnValue(walletAsset);

    const result = getMoneyDepositPaymentToken(earnAsset);

    expect(result).toEqual({
      address: ADDRESS,
      chainId: '0x1',
    });
    expect(mockRequireTrackedEarnAsset).toHaveBeenCalledWith(
      earnAsset,
      'Money deposit',
    );
  });

  it('propagates the tracked-asset requirement error', () => {
    const earnAsset = createEarnAsset({ status: 'untracked' });
    const error = new Error(
      `Money deposit requires wallet-tracked asset: ${ASSET_ID}`,
    );
    mockRequireTrackedEarnAsset.mockImplementation(() => {
      throw error;
    });

    expect(() => getMoneyDepositPaymentToken(earnAsset)).toThrow(error);
  });

  it('throws when the tracked wallet asset does not have an address', () => {
    const assetWithoutAddress = createWalletAsset();
    Reflect.deleteProperty(assetWithoutAddress, 'address');
    const earnAsset = createEarnAsset({
      status: 'tracked',
      asset: assetWithoutAddress,
    });
    mockRequireTrackedEarnAsset.mockReturnValue(assetWithoutAddress);

    expect(() => getMoneyDepositPaymentToken(earnAsset)).toThrow(
      'Money deposit requires tracked asset with address',
    );
  });
});
