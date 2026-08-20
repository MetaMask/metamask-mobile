import type { EarnAsset, EarnAssetId } from '../../types/earnAssets';
import {
  getEarnAssetFiatDisplay,
  getEarnAssetFiatNumber,
  hasEarnAssetBalance,
} from './earnAssetBalance';

const createAsset = (overrides: Partial<EarnAsset> = {}): EarnAsset => ({
  assetId:
    'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as EarnAssetId,
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  chainId: '0x1',
  decimals: 6,
  image: 'usdc.png',
  name: 'USD Coin',
  symbol: 'USDC',
  ticker: 'USDC',
  balance: '0',
  logo: 'usdc.png',
  isETH: false,
  experiences: [],
  ...overrides,
});

describe('hasEarnAssetBalance', () => {
  it('uses balanceMinimalUnit when it is available', () => {
    const asset = createAsset({
      balance: '0',
      balanceMinimalUnit: '1000000',
    });

    const result = hasEarnAssetBalance(asset);

    expect(result).toBe(true);
  });

  it('returns false for a zero balanceMinimalUnit', () => {
    const asset = createAsset({
      balance: '100',
      balanceMinimalUnit: '0',
    });

    const result = hasEarnAssetBalance(asset);

    expect(result).toBe(false);
  });

  it('uses rawBalance when balanceMinimalUnit is unavailable', () => {
    const asset = createAsset({
      rawBalance: '0x1',
    });

    const result = hasEarnAssetBalance(asset);

    expect(result).toBe(true);
  });

  it('returns false for an empty raw balance', () => {
    const asset = createAsset({
      rawBalance: '0x0',
    });

    const result = hasEarnAssetBalance(asset);

    expect(result).toBe(false);
  });

  it('uses decimal balance when higher-priority balances are unavailable', () => {
    const asset = createAsset({
      balance: '0.01',
    });

    const result = hasEarnAssetBalance(asset);

    expect(result).toBe(true);
  });
});

describe('getEarnAssetFiatNumber', () => {
  it('returns an available balanceFiatNumber', () => {
    const asset = createAsset({
      balanceFiatNumber: 12.34,
      fiat: { balance: 56.78, currency: 'USD' },
    });

    const result = getEarnAssetFiatNumber(asset);

    expect(result).toBe(12.34);
  });

  it('uses fiat balance when balanceFiatNumber is unavailable', () => {
    const asset = createAsset({
      balanceFiatNumber: undefined,
      fiat: { balance: 56.78, currency: 'USD' },
    });

    const result = getEarnAssetFiatNumber(asset);

    expect(result).toBe(56.78);
  });

  it('does not expose balanceFiatNumber when fiat is unavailable', () => {
    const asset = createAsset({
      isBalanceFiatAvailable: false,
      balanceFiatNumber: 12.34,
    });

    const result = getEarnAssetFiatNumber(asset);

    expect(result).toBeUndefined();
  });
});

describe('getEarnAssetFiatDisplay', () => {
  it('prefers formatted balanceFiat over selected-currency balance', () => {
    const asset = createAsset({
      balanceFiat: '$12.34',
      balanceInSelectedCurrency: '$56.78',
    });

    const result = getEarnAssetFiatDisplay(asset);

    expect(result).toBe('$12.34');
  });

  it('uses selected-currency balance when formatted balanceFiat is unavailable', () => {
    const asset = createAsset({
      balanceInSelectedCurrency: '$56.78',
    });

    const result = getEarnAssetFiatDisplay(asset);

    expect(result).toBe('$56.78');
  });
});
