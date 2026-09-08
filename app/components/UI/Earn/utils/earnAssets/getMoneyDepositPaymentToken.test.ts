import type { Asset } from '@metamask/assets-controllers';
import { EthAccountType } from '@metamask/keyring-api';
import type {
  DiscoveryEarnAsset,
  EarnAssetId,
  HeldEarnAsset,
} from '../../types/earnAssets';
import { getMoneyDepositPaymentToken } from './getMoneyDepositPaymentToken';

const ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const ASSET_ID = `eip155:1/erc20:${ADDRESS}` as EarnAssetId;

const createHeldEarnAsset = (asset: Asset): HeldEarnAsset => ({
  kind: 'held',
  assetId: ASSET_ID,
  asset,
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
  it('returns the held asset address and chain ID', () => {
    const earnAsset = createHeldEarnAsset(createWalletAsset());

    const result = getMoneyDepositPaymentToken(earnAsset);

    expect(result).toEqual({
      address: ADDRESS,
      chainId: '0x1',
    });
  });

  it('throws when the Earn asset is not held', () => {
    const discoveryAsset: DiscoveryEarnAsset = {
      kind: 'discovery',
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
      experiences: [],
    };

    expect(() => getMoneyDepositPaymentToken(discoveryAsset)).toThrow(
      'Money deposit requires a held asset with address property',
    );
  });

  it('throws when the held asset does not have an address', () => {
    const assetWithoutAddress = createWalletAsset();
    Reflect.deleteProperty(assetWithoutAddress, 'address');
    const earnAsset = createHeldEarnAsset(assetWithoutAddress);

    expect(() => getMoneyDepositPaymentToken(earnAsset)).toThrow(
      'Money deposit requires a held asset with address property',
    );
  });
});
