import { reorderAssets, pickPrimaryFromReordered } from './assetPriority';
import {
  FundingAssetStatus,
  type CardFundingAsset,
} from '../../../../core/Engine/controllers/card-controller/provider-types';

function makeAsset(
  overrides: Partial<CardFundingAsset> & {
    symbol: string;
    walletAddress: string;
    priority: number;
    balance: string;
  },
): CardFundingAsset {
  return {
    address: '0xtoken',
    name: 'Token',
    decimals: 18,
    chainId: 'eip155:1' as `eip155:${number}`,
    allowance: '0',
    status: FundingAssetStatus.Active,
    ...overrides,
  };
}

describe('reorderAssets', () => {
  const assetA = makeAsset({
    symbol: 'USDC',
    walletAddress: '0xw1',
    priority: 1,
    balance: '0',
  });
  const assetB = makeAsset({
    symbol: 'USDT',
    walletAddress: '0xw2',
    priority: 2,
    balance: '50',
  });
  const assetC = makeAsset({
    symbol: 'DAI',
    walletAddress: '0xw3',
    priority: 3,
    balance: '100',
  });

  it('assigns priority 1 to the selected asset', () => {
    const result = reorderAssets(assetB, [assetA, assetB, assetC]);
    expect(result[0].walletAddress).toBe('0xw2');
    expect(result[0].priority).toBe(1);
  });

  it('renumbers other assets starting from 2 in their original relative order', () => {
    const result = reorderAssets(assetB, [assetA, assetB, assetC]);
    // assetA and assetC should be renumbered 2 and 3 in order
    const nonSelected = result.filter((a) => a.walletAddress !== '0xw2');
    expect(nonSelected[0].walletAddress).toBe('0xw1');
    expect(nonSelected[0].priority).toBe(2);
    expect(nonSelected[1].walletAddress).toBe('0xw3');
    expect(nonSelected[1].priority).toBe(3);
  });

  it('returns array sorted by priority ascending', () => {
    const result = reorderAssets(assetC, [assetA, assetB, assetC]);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].priority).toBeGreaterThan(result[i - 1].priority);
    }
  });

  it('handles selected asset already at priority 1 (order unchanged)', () => {
    const result = reorderAssets(assetA, [assetA, assetB, assetC]);
    expect(result[0].walletAddress).toBe('0xw1');
    expect(result[0].priority).toBe(1);
  });

  it('matches symbol case-insensitively', () => {
    const lowerCaseTarget = makeAsset({
      symbol: 'usdc',
      walletAddress: '0xw1',
      priority: 3,
      balance: '0',
      address: '0xtoken', // same address/chain as assetA
    });
    const result = reorderAssets(lowerCaseTarget, [assetA, assetB]);
    // assetA (USDC) should get priority 1 since it matches case-insensitively
    const promoted = result.find((a) => a.walletAddress === '0xw1');
    expect(promoted?.priority).toBe(1);
  });

  it('does not mutate the input array', () => {
    const original = [assetA, assetB, assetC];
    const originalCopy = [...original];
    reorderAssets(assetB, original);
    expect(original).toStrictEqual(originalCopy);
  });
});

describe('pickPrimaryFromReordered', () => {
  it('returns the priority-1 asset when it has a positive balance', () => {
    const assets = [
      makeAsset({
        symbol: 'USDT',
        walletAddress: '0xw1',
        priority: 1,
        balance: '100',
      }),
      makeAsset({
        symbol: 'USDC',
        walletAddress: '0xw2',
        priority: 2,
        balance: '200',
      }),
    ];
    const result = pickPrimaryFromReordered(assets);
    expect(result?.walletAddress).toBe('0xw1');
  });

  it('skips priority-1 with zero balance and returns first asset with positive balance', () => {
    const assets = [
      makeAsset({
        symbol: 'USDT',
        walletAddress: '0xw1',
        priority: 1,
        balance: '0',
      }),
      makeAsset({
        symbol: 'USDC',
        walletAddress: '0xw2',
        priority: 2,
        balance: '0',
      }),
      makeAsset({
        symbol: 'DAI',
        walletAddress: '0xw3',
        priority: 3,
        balance: '50',
      }),
    ];
    const result = pickPrimaryFromReordered(assets);
    expect(result?.walletAddress).toBe('0xw3');
  });

  it('falls back to the first asset when no asset has a positive balance', () => {
    const assets = [
      makeAsset({
        symbol: 'USDT',
        walletAddress: '0xw1',
        priority: 1,
        balance: '0',
      }),
      makeAsset({
        symbol: 'USDC',
        walletAddress: '0xw2',
        priority: 2,
        balance: '0',
      }),
    ];
    const result = pickPrimaryFromReordered(assets);
    expect(result?.walletAddress).toBe('0xw1');
  });

  it('returns null for an empty array', () => {
    expect(pickPrimaryFromReordered([])).toBeNull();
  });
});
