import type { AccountGroupAssets, Asset } from '@metamask/assets-controllers';
import {
  isZeroAssetAmount,
  shouldShowAssetsLoadingSkeleton,
} from './shouldShowAssetsLoadingSkeleton';

const musdAddress = '0xaca92e438df0b2401ff60da7e4337b687a2435da' as const;

const asset = (
  overrides: Partial<Asset> & {
    address?: string;
    chainId?: string;
    balance?: string;
    fiat?: { balance: number } | undefined;
  } = {},
): Asset =>
  ({
    accountType: 'eip155:eoa',
    accountId: 'account-1',
    assetId: (overrides.address ??
      '0x0000000000000000000000000000000000000000') as `0x${string}`,
    address: (overrides.address ??
      '0x0000000000000000000000000000000000000000') as `0x${string}`,
    chainId: (overrides.chainId ?? '0x1') as `0x${string}`,
    image: '',
    name: 'Token',
    symbol: 'TKN',
    decimals: 18,
    isNative: false,
    rawBalance: '0x0',
    balance: '0',
    fiat: { balance: 0, currency: 'usd', conversionRate: 1 },
    ...overrides,
  }) as Asset;

const assetsByChain = (entries: Record<string, Asset[]>): AccountGroupAssets =>
  entries;

describe('isZeroAssetAmount', () => {
  it('treats nullish and empty values as zero', () => {
    expect(isZeroAssetAmount(null)).toBe(true);
    expect(isZeroAssetAmount(undefined)).toBe(true);
    expect(isZeroAssetAmount('')).toBe(true);
  });

  it('treats numeric zero as zero and positive values as non-zero', () => {
    expect(isZeroAssetAmount(0)).toBe(true);
    expect(isZeroAssetAmount('0')).toBe(true);
    expect(isZeroAssetAmount(1.5)).toBe(false);
    expect(isZeroAssetAmount('2')).toBe(false);
  });
});

describe('shouldShowAssetsLoadingSkeleton', () => {
  it('hides the skeleton once assets have loaded', () => {
    expect(
      shouldShowAssetsLoadingSkeleton({
        assetsHaveLoaded: true,
        assetsByChain: assetsByChain({
          '0x1': [asset({ isNative: true, balance: '0' })],
        }),
      }),
    ).toBe(false);
  });

  it('shows the skeleton while unsettled and only zero native or mUSD placeholders exist', () => {
    expect(
      shouldShowAssetsLoadingSkeleton({
        assetsHaveLoaded: false,
        assetsByChain: assetsByChain({
          '0x1': [
            asset({
              isNative: true,
              balance: '0',
              fiat: { balance: 0, currency: 'usd', conversionRate: 1 },
            }),
            asset({
              address: musdAddress,
              balance: '0',
              fiat: { balance: 0, currency: 'usd', conversionRate: 1 },
            }),
          ],
        }),
      }),
    ).toBe(true);
  });

  it('hides the skeleton while unsettled when a real non-zero balance is already present', () => {
    expect(
      shouldShowAssetsLoadingSkeleton({
        assetsHaveLoaded: false,
        assetsByChain: assetsByChain({
          '0x1': [
            asset({
              isNative: true,
              balance: '1',
              fiat: { balance: 12.5, currency: 'usd', conversionRate: 1 },
            }),
          ],
        }),
      }),
    ).toBe(false);
  });

  it('hides the skeleton while unsettled when a non-placeholder token is present', () => {
    expect(
      shouldShowAssetsLoadingSkeleton({
        assetsHaveLoaded: false,
        assetsByChain: assetsByChain({
          '0x1': [
            asset({
              address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
              balance: '0',
              fiat: { balance: 0, currency: 'usd', conversionRate: 1 },
            }),
          ],
        }),
      }),
    ).toBe(false);
  });

  it('shows the skeleton for an empty unsettled asset map', () => {
    expect(
      shouldShowAssetsLoadingSkeleton({
        assetsHaveLoaded: false,
        assetsByChain: {},
      }),
    ).toBe(true);
  });

  it('scopes the placeholder check to allowed chains when provided', () => {
    expect(
      shouldShowAssetsLoadingSkeleton({
        assetsHaveLoaded: false,
        allowedChainIds: ['0x1'],
        assetsByChain: assetsByChain({
          '0x1': [
            asset({
              isNative: true,
              balance: '0',
              fiat: { balance: 0, currency: 'usd', conversionRate: 1 },
            }),
          ],
          '0xa': [
            asset({
              isNative: true,
              balance: '5',
              fiat: { balance: 20, currency: 'usd', conversionRate: 1 },
              chainId: '0xa',
            }),
          ],
        }),
      }),
    ).toBe(true);
  });

  it('matches Hex asset keys when allowed chains are provided as CAIP-2', () => {
    expect(
      shouldShowAssetsLoadingSkeleton({
        assetsHaveLoaded: false,
        allowedChainIds: ['eip155:1'],
        assetsByChain: assetsByChain({
          '0x1': [
            asset({
              isNative: true,
              balance: '0',
              fiat: { balance: 0, currency: 'usd', conversionRate: 1 },
            }),
          ],
          '0x539': [
            asset({
              isNative: true,
              balance: '10',
              fiat: { balance: 50, currency: 'usd', conversionRate: 1 },
              chainId: '0x539',
            }),
          ],
        }),
      }),
    ).toBe(true);
  });
});
