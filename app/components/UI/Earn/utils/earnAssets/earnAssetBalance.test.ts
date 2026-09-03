import type { Asset } from '@metamask/assets-controllers';
import { EthAccountType } from '@metamask/keyring-api';
import type { EarnAsset, EarnAssetId } from '../../types/earnAssets';
import {
  getEarnAssetFiatDisplay,
  getEarnAssetFiatNumber,
  hasEarnAssetBalance,
  isEarnAssetBalanceBelowMinDepositAmount,
} from './earnAssetBalance';

const createWalletAsset = (overrides: Partial<Asset> = {}): Asset =>
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
    balance: '0',
    rawBalance: '0x0',
    fiat: undefined,
    isNative: false,
    ...overrides,
  }) as Asset;

const createAsset = (overrides: Partial<Asset> = {}): EarnAsset => ({
  kind: 'held',
  assetId:
    'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as EarnAssetId,
  asset: createWalletAsset(overrides),
  experiences: [],
});

describe('hasEarnAssetBalance', () => {
  it('returns true for a positive controller raw balance', () => {
    const asset = createAsset({
      rawBalance: '0x1',
    });

    const result = hasEarnAssetBalance(asset);

    expect(result).toBe(true);
  });

  it('returns false for a zero controller raw balance', () => {
    const asset = createAsset({
      rawBalance: '0x0',
    });

    const result = hasEarnAssetBalance(asset);

    expect(result).toBe(false);
  });

  it('returns false for a discovery asset', () => {
    const asset: EarnAsset = {
      kind: 'discovery',
      assetId:
        'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as EarnAssetId,
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
      experiences: [],
    };

    const result = hasEarnAssetBalance(asset);

    expect(result).toBe(false);
  });
});

describe('getEarnAssetFiatNumber', () => {
  it('returns the controller fiat balance', () => {
    const asset = createAsset({
      fiat: { balance: 12.34, currency: 'USD', conversionRate: 1 },
    });

    const result = getEarnAssetFiatNumber(asset);

    expect(result).toBe(12.34);
  });

  it('returns undefined when controller fiat is unavailable', () => {
    const asset = createAsset({ fiat: undefined });

    const result = getEarnAssetFiatNumber(asset);

    expect(result).toBeUndefined();
  });
});

describe('getEarnAssetFiatDisplay', () => {
  it('formats the controller fiat balance', () => {
    const asset = createAsset({
      fiat: { balance: 12.34, currency: 'USD', conversionRate: 1 },
    });

    const result = getEarnAssetFiatDisplay(asset);

    expect(result).toBe('$12.34');
  });

  it('returns undefined when controller fiat is unavailable', () => {
    const asset = createAsset({ fiat: undefined });

    const result = getEarnAssetFiatDisplay(asset);

    expect(result).toBeUndefined();
  });
});

describe('isEarnAssetBalanceBelowMinDepositAmount', () => {
  it('returns true for a held asset below the minimum deposit amount', () => {
    const asset = createAsset({
      fiat: { balance: 0.009, currency: 'USD', conversionRate: 1 },
    });

    const result = isEarnAssetBalanceBelowMinDepositAmount(asset);

    expect(result).toBe(true);
  });

  it('returns false for a held asset at the minimum deposit amount', () => {
    const asset = createAsset({
      fiat: { balance: 0.01, currency: 'USD', conversionRate: 1 },
    });

    const result = isEarnAssetBalanceBelowMinDepositAmount(asset);

    expect(result).toBe(false);
  });

  it('returns false for a held asset above the minimum deposit amount', () => {
    const asset = createAsset({
      fiat: { balance: 0.011, currency: 'USD', conversionRate: 1 },
    });

    const result = isEarnAssetBalanceBelowMinDepositAmount(asset);

    expect(result).toBe(false);
  });

  it('returns true for a held asset without a fiat balance', () => {
    const asset = createAsset({ fiat: undefined });

    const result = isEarnAssetBalanceBelowMinDepositAmount(asset);

    expect(result).toBe(true);
  });

  it('returns true for a discovery asset', () => {
    const asset: EarnAsset = {
      kind: 'discovery',
      assetId:
        'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as EarnAssetId,
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
      experiences: [],
    };

    const result = isEarnAssetBalanceBelowMinDepositAmount(asset);

    expect(result).toBe(true);
  });
});
