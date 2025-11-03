import { Asset } from '@metamask/assets-controllers';
import {
  compareFiatBalanceWithPriority,
  sortAssetsWithPriority,
} from './sortAssetsWithPriority';
import { CaipChainId, Hex } from '@metamask/utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';

function createMockAsset({
  name,
  fiatBalance,
  isNative = true,
  chainId = CHAIN_IDS.MAINNET,
}: {
  name: string;
  fiatBalance?: number;
  isNative?: boolean;
  chainId?: Hex | CaipChainId;
}): Asset {
  return {
    name,
    fiat: fiatBalance ? { balance: fiatBalance } : undefined,
    isNative,
    chainId,
  } as unknown as Asset;
}

describe('sortAssetsWithPriority', () => {
  function extractAssetNames(assets: Asset[]): string[] {
    return assets.map((asset) => asset.name);
  }

  it('sorts by name when key is "name"', () => {
    const assets = [
      createMockAsset({ name: 'Asset B', fiatBalance: 400 }),
      createMockAsset({ name: 'Asset A', fiatBalance: 600 }),
      createMockAsset({ name: 'Asset Z', fiatBalance: 500 }),
    ];

    const sortedAssets = sortAssetsWithPriority(assets, {
      key: 'name',
      order: 'asc',
      sortCallback: 'alphaNumeric',
    });

    expect(extractAssetNames(sortedAssets)).toStrictEqual([
      'Asset A',
      'Asset B',
      'Asset Z',
    ]);
  });

  it('sorts by fiat balance when key is "tokenFiatAmount"', () => {
    const assets = [
      createMockAsset({ name: 'Asset B', fiatBalance: 400 }),
      createMockAsset({ name: 'Asset A', fiatBalance: 600 }),
      createMockAsset({ name: 'Asset Z', fiatBalance: 500 }),
    ];

    const sortedAssets = sortAssetsWithPriority(assets, {
      key: 'tokenFiatAmount',
      order: 'dsc',
      sortCallback: 'stringNumeric',
    });

    expect(extractAssetNames(sortedAssets)).toStrictEqual([
      'Asset A',
      'Asset Z',
      'Asset B',
    ]);
  });
});

describe('compareFiatBalanceWithPriority', () => {
  describe('fiat balance comparison', () => {
    it('returns -1 if the first asset has a fiat balance and the second asset does not', () => {
      const assetA = createMockAsset({ name: 'Asset A', fiatBalance: 400 });
      const assetB = createMockAsset({
        name: 'Asset B',
        fiatBalance: undefined,
      });

      const result = compareFiatBalanceWithPriority(assetA, assetB);

      expect(result).toBe(-1);
    });

    it('returns 1 if the second asset has a fiat balance and the first asset does not', () => {
      const assetA = createMockAsset({
        name: 'Asset A',
        fiatBalance: undefined,
      });
      const assetB = createMockAsset({ name: 'Asset B', fiatBalance: 400 });

      const result = compareFiatBalanceWithPriority(assetA, assetB);

      expect(result).toBe(1);
    });

    it('compares first value above the second value if both assets have fiat balances and the first value is greater', () => {
      const assetA = createMockAsset({ name: 'Asset A', fiatBalance: 400 });
      const assetB = createMockAsset({ name: 'Asset B', fiatBalance: 300 });

      const result = compareFiatBalanceWithPriority(assetA, assetB);

      expect(result).toBeLessThan(0);
    });
  });

  describe('non-native asset comparison', () => {
    it('returns -1 if the first asset is native and the second asset is not', () => {
      const assetA = createMockAsset({ name: 'Asset A', isNative: true });
      const assetB = createMockAsset({ name: 'Asset B', isNative: false });

      const result = compareFiatBalanceWithPriority(assetA, assetB);

      expect(result).toBe(-1);
    });

    it('returns 1 if the second asset is native and the first asset is not', () => {
      const assetA = createMockAsset({ name: 'Asset A', isNative: false });
      const assetB = createMockAsset({ name: 'Asset B', isNative: true });

      const result = compareFiatBalanceWithPriority(assetA, assetB);

      expect(result).toBe(1);
    });

    it('compares name values if neither asset is native', () => {
      const assetA = createMockAsset({ name: 'Asset A', isNative: false });
      const assetB = createMockAsset({ name: 'Asset B', isNative: false });

      const result = compareFiatBalanceWithPriority(assetA, assetB);

      expect(result).toBe(-1);
    });
  });

  describe('native asset comparison', () => {
    it('compares first value above second if the first asset is in the defaultNativeAssetOrder and the second asset is not', () => {
      const assetA = createMockAsset({
        name: 'Asset A',
        chainId: CHAIN_IDS.BASE,
      });
      const assetB = createMockAsset({
        name: 'Asset B',
        chainId: '0xeeeeeeeeeeeee1',
      });

      const result = compareFiatBalanceWithPriority(assetA, assetB);

      expect(result).toBeLessThan(0);
    });

    it('compares first value above second if both assets are in the defaultNativeAssetOrder and the first value has higher priority', () => {
      const assetA = createMockAsset({
        name: 'Asset A',
        chainId: CHAIN_IDS.LINEA_MAINNET,
      });
      const assetB = createMockAsset({
        name: 'Asset B',
        chainId: CHAIN_IDS.ARBITRUM,
      });

      const result = compareFiatBalanceWithPriority(assetA, assetB);

      expect(result).toBeLessThan(0);
    });

    it('compares name values if neither asset is in the defaultNativeAssetOrder', () => {
      const assetA = createMockAsset({
        name: 'Asset A',
        chainId: '0xeeeeeeeeeeeee1',
      });
      const assetB = createMockAsset({
        name: 'Asset B',
        chainId: '0xeeeeeeeeeeeee2',
      });

      const result = compareFiatBalanceWithPriority(assetA, assetB);

      expect(result).toBeLessThan(0);
    });
  });
});
