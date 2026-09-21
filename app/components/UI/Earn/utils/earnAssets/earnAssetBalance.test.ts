import type { Asset } from '@metamask/assets-controllers';
import { EthAccountType } from '@metamask/keyring-api';
import type { EarnAsset, EarnAssetId } from '../../types/earnAssets';
import {
  getEarnAssetFiatDisplay,
  getEarnAssetFiatNumber,
  hasEarnAssetBalance,
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
  wallet: { status: 'tracked', asset: createWalletAsset(overrides) },
  experiences: [],
});

const createUntrackedAsset = (): EarnAsset => ({
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
  wallet: { status: 'untracked' },
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

  it('returns false for a malformed controller raw balance', () => {
    const asset = createAsset({
      rawBalance: 'not-a-raw-balance' as Asset['rawBalance'],
    });

    const result = hasEarnAssetBalance(asset);

    expect(result).toBe(false);
  });

  it('returns false for a negative controller raw balance', () => {
    const asset = createAsset({
      rawBalance: '-1' as Asset['rawBalance'],
    });

    const result = hasEarnAssetBalance(asset);

    expect(result).toBe(false);
  });

  it('returns false for an untracked asset', () => {
    const asset = createUntrackedAsset();

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

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'returns undefined for a non-finite controller fiat balance: %s',
    (balance) => {
      const asset = createAsset({
        fiat: { balance, currency: 'USD', conversionRate: 1 },
      });

      const result = getEarnAssetFiatNumber(asset);

      expect(result).toBeUndefined();
    },
  );

  it('returns undefined for an untracked asset fiat balance', () => {
    const result = getEarnAssetFiatNumber(createUntrackedAsset());

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

  it('returns undefined for an untracked asset fiat display', () => {
    const result = getEarnAssetFiatDisplay(createUntrackedAsset());

    expect(result).toBeUndefined();
  });
});
