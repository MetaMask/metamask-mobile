import type { Asset } from '@metamask/assets-controller';
import {
  isZeroAssetAmount,
  shouldShowAssetsLoadingSkeleton,
} from './shouldShowAssetsLoadingSkeleton';

const musdAddress = '0xaca92e438df0b2401ff60da7e4337b687a2435da';

const asset = (overrides: Partial<Asset> & { address?: string }): Asset =>
  ({
    assetId: overrides.address ?? 'eip155:1/slip44:60',
    address: overrides.address,
    chainId: '0x1',
    isNative: false,
    balance: '0',
    fiat: { balance: 0 },
    ...overrides,
  }) as Asset;

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
        assetsByChain: {
          '0x1': [asset({ isNative: true, balance: '0' })],
        },
      }),
    ).toBe(false);
  });

  it('shows the skeleton while unsettled and only zero native or mUSD placeholders exist', () => {
    expect(
      shouldShowAssetsLoadingSkeleton({
        assetsHaveLoaded: false,
        assetsByChain: {
          '0x1': [
            asset({ isNative: true, balance: '0', fiat: { balance: 0 } }),
            asset({
              address: musdAddress,
              balance: '0',
              fiat: { balance: 0 },
            }),
          ],
        },
      }),
    ).toBe(true);
  });

  it('hides the skeleton while unsettled when a real non-zero balance is already present', () => {
    expect(
      shouldShowAssetsLoadingSkeleton({
        assetsHaveLoaded: false,
        assetsByChain: {
          '0x1': [
            asset({
              isNative: true,
              balance: '1',
              fiat: { balance: 12.5 },
            }),
          ],
        },
      }),
    ).toBe(false);
  });

  it('hides the skeleton while unsettled when a non-placeholder token is present', () => {
    expect(
      shouldShowAssetsLoadingSkeleton({
        assetsHaveLoaded: false,
        assetsByChain: {
          '0x1': [
            asset({
              address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
              balance: '0',
              fiat: { balance: 0 },
            }),
          ],
        },
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
        assetsByChain: {
          '0x1': [
            asset({ isNative: true, balance: '0', fiat: { balance: 0 } }),
          ],
          '0xa': [
            asset({
              isNative: true,
              balance: '5',
              fiat: { balance: 20 },
              chainId: '0xa',
            }),
          ],
        },
      }),
    ).toBe(true);
  });

  it('matches Hex asset keys when allowed chains are provided as CAIP-2', () => {
    expect(
      shouldShowAssetsLoadingSkeleton({
        assetsHaveLoaded: false,
        allowedChainIds: ['eip155:1'],
        assetsByChain: {
          '0x1': [
            asset({ isNative: true, balance: '0', fiat: { balance: 0 } }),
          ],
          '0x539': [
            asset({
              isNative: true,
              balance: '10',
              fiat: { balance: 50 },
              chainId: '0x539',
            }),
          ],
        },
      }),
    ).toBe(true);
  });
});
