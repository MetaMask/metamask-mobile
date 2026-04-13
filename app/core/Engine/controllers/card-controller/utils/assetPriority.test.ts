import { FundingAssetStatus, type CardFundingAsset } from '../provider-types';
import { pickPrimaryFromReordered, reorderAssets } from './assetPriority';

const LINEA = 'eip155:59144' as const;
const BASE = 'eip155:8453' as const;

function makeAsset(
  overrides: Partial<CardFundingAsset> = {},
): CardFundingAsset {
  return {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xtoken',
    walletAddress: '0xwallet',
    decimals: 6,
    chainId: LINEA,
    balance: '10',
    allowance: '100',
    priority: 99,
    status: FundingAssetStatus.Active,
    ...overrides,
  };
}

describe('reorderAssets', () => {
  it('sets selected asset to priority 1 and renumbers others in list order', () => {
    const a = makeAsset({ symbol: 'A', priority: 1, balance: '1' });
    const b = makeAsset({ symbol: 'B', priority: 2, balance: '2' });
    const c = makeAsset({ symbol: 'C', priority: 3, balance: '3' });

    const result = reorderAssets(b, [a, b, c]);

    expect(result.map((x) => x.symbol)).toEqual(['B', 'A', 'C']);
    expect(result.find((x) => x.symbol === 'B')?.priority).toBe(1);
    expect(result.find((x) => x.symbol === 'A')?.priority).toBe(2);
    expect(result.find((x) => x.symbol === 'C')?.priority).toBe(3);
  });

  it('matches symbol case-insensitively against the selected asset', () => {
    const dai = makeAsset({ symbol: 'DAI', balance: '5' });
    const selected = makeAsset({ symbol: 'usdc' });
    const upperSameToken = makeAsset({ symbol: 'USDC', balance: '1' });

    const result = reorderAssets(selected, [dai, upperSameToken, selected]);

    expect(result[0]?.priority).toBe(1);
    expect(result[0]?.symbol.toLowerCase()).toBe('usdc');
    expect(result.find((x) => x.symbol === 'DAI')?.priority).toBe(2);
    expect(result.find((x) => x.symbol === 'USDC')?.priority).toBe(1);
  });

  it('does not treat same symbol on a different chain as selected', () => {
    const onLinea = makeAsset({ symbol: 'USDC', chainId: LINEA });
    const onBase = makeAsset({
      symbol: 'USDC',
      chainId: BASE,
      walletAddress: '0xwallet',
    });

    const result = reorderAssets(onBase, [onLinea, onBase]);

    expect(result[0]?.chainId).toBe(BASE);
    expect(result[0]?.priority).toBe(1);
    expect(result.find((x) => x.chainId === LINEA)?.priority).toBe(2);
  });

  it('requires matching walletAddress', () => {
    const selected = makeAsset({ walletAddress: '0xaaa' });
    const sameTokenOtherWallet = makeAsset({
      walletAddress: '0xbbb',
      symbol: selected.symbol,
      chainId: selected.chainId,
    });

    const result = reorderAssets(selected, [sameTokenOtherWallet, selected]);

    expect(result[0]?.walletAddress).toBe('0xaaa');
    expect(result[0]?.priority).toBe(1);
    expect(result[1]?.walletAddress).toBe('0xbbb');
    expect(result[1]?.priority).toBe(2);
  });
});

describe('pickPrimaryFromReordered', () => {
  it('returns null when there are no assets', () => {
    expect(pickPrimaryFromReordered([])).toBeNull();
  });

  it('returns the first asset when its balance is positive', () => {
    const first = makeAsset({ symbol: 'FIRST', balance: '1' });
    const second = makeAsset({ symbol: 'SECOND', balance: '99' });

    expect(pickPrimaryFromReordered([first, second])).toBe(first);
  });

  it('skips a zero first balance and returns the first asset with a positive balance', () => {
    const empty = makeAsset({ symbol: 'EMPTY', balance: '0' });
    const funded = makeAsset({ symbol: 'FUNDED', balance: '0.25' });

    expect(pickPrimaryFromReordered([empty, funded])).toBe(funded);
  });

  it('treats "0.0" as zero when searching for a positive balance', () => {
    const zeroish = makeAsset({ symbol: 'Z', balance: '0.0' });
    const funded = makeAsset({ symbol: 'F', balance: '1' });

    expect(pickPrimaryFromReordered([zeroish, funded])).toBe(funded);
  });

  it('falls back to the first asset when all balances are zero', () => {
    const a = makeAsset({ symbol: 'A', balance: '0' });
    const b = makeAsset({ symbol: 'B', balance: '0.0' });

    expect(pickPrimaryFromReordered([a, b])).toBe(a);
  });
});
