import type { Asset } from '@metamask/assets-controllers';
import { EthAccountType } from '@metamask/keyring-api';
import type { EarnAsset, EarnAssetId } from '../../types/earnAssets';
import { requireTrackedWalletAsset } from './requireTrackedWalletAsset';

const ASSET_ID =
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as EarnAssetId;

const createWalletAsset = (): Asset =>
  ({
    accountType: EthAccountType.Eoa,
    accountId: 'account-id',
    assetId: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
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

const createEarnAsset = (wallet: EarnAsset['wallet']): EarnAsset => ({
  assetId: ASSET_ID,
  metadata: {
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
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

describe('requireTrackedWalletAsset', () => {
  it('returns the wallet asset when wallet status is tracked', () => {
    const walletAsset = createWalletAsset();
    const earnAsset = createEarnAsset({
      status: 'tracked',
      asset: walletAsset,
    });

    const result = requireTrackedWalletAsset(earnAsset, 'Token send');

    expect(result).toBe(walletAsset);
  });

  it('throws the operation and asset ID when wallet status is untracked', () => {
    const earnAsset = createEarnAsset({ status: 'untracked' });

    expect(() => requireTrackedWalletAsset(earnAsset, 'Token send')).toThrow(
      `Token send requires wallet-tracked asset: ${ASSET_ID}`,
    );
  });
});
