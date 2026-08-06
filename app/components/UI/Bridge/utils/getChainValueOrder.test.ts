import { CaipChainId } from '@metamask/utils';
import type { NetworkPositionOverrides } from '../../../../selectors/featureFlagController/swapsNetworkValueOrder';
import {
  getHoldingsByChain,
  getChainValueOrder,
  HoldingAssetsByChain,
  ChainRankingEntry,
} from './getChainValueOrder';

const ETHEREUM = 'eip155:1' as CaipChainId;
const BASE = 'eip155:8453' as CaipChainId;
const OPTIMISM = 'eip155:10' as CaipChainId;
const ROBINHOOD = 'eip155:46630' as CaipChainId;
const SOLANA = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId;

const CHAIN_RANKING: ChainRankingEntry[] = [
  { chainId: ROBINHOOD, name: 'Robinhood' },
  { chainId: BASE, name: 'Base' },
  { chainId: OPTIMISM, name: 'Optimism' },
  { chainId: ETHEREUM, name: 'Ethereum' },
  { chainId: SOLANA, name: 'Solana' },
];

function createAssets(
  holdingsByChain: Partial<Record<CaipChainId, number>>,
): HoldingAssetsByChain {
  return Object.entries(holdingsByChain).reduce<HoldingAssetsByChain>(
    (assetsByChain, [chainId, holdingsValue]) => ({
      ...assetsByChain,
      [chainId]: [
        {
          chainId,
          fiat: { balance: holdingsValue },
        },
      ],
    }),
    {},
  );
}

function getChainIds(chains: ChainRankingEntry[]): CaipChainId[] {
  return chains.map(({ chainId }) => chainId);
}

describe('getHoldingsByChain', () => {
  it('sums native and token fiat balances by normalized CAIP chain ID', () => {
    const assetsByChain: HoldingAssetsByChain = {
      '0x1': [
        { chainId: '0x1', fiat: { balance: 100 } },
        { chainId: '0x1', fiat: { balance: 25 } },
      ],
      [SOLANA]: [{ chainId: SOLANA, fiat: { balance: 200 } }],
    };

    const result = getHoldingsByChain(assetsByChain);

    expect(result).toEqual({
      [ETHEREUM]: 125,
      [SOLANA]: 200,
    });
  });

  it('counts missing, non-finite, and negative fiat balances as zero', () => {
    const assetsByChain: HoldingAssetsByChain = {
      [ETHEREUM]: [
        { chainId: ETHEREUM },
        { chainId: ETHEREUM, fiat: { balance: Number.NaN } },
        { chainId: ETHEREUM, fiat: { balance: -1 } },
      ],
    };

    const result = getHoldingsByChain(assetsByChain);

    expect(result).toEqual({ [ETHEREUM]: 0 });
  });

  it('skips assets whose chain ID is neither CAIP nor EVM hex', () => {
    const assetsByChain: HoldingAssetsByChain = {
      unsupported: [{ chainId: 'unsupported', fiat: { balance: 100 } }],
    };

    const result = getHoldingsByChain(assetsByChain);

    expect(result).toEqual({});
  });
});

describe('getChainValueOrder', () => {
  it('orders chains by total holdings value descending', () => {
    const assetsByChain = createAssets({
      [ETHEREUM]: 100,
      [BASE]: 300,
      [SOLANA]: 200,
    });

    const result = getChainValueOrder(CHAIN_RANKING, assetsByChain, {});

    expect(getChainIds(result)).toEqual([
      BASE,
      SOLANA,
      ETHEREUM,
      ROBINHOOD,
      OPTIMISM,
    ]);
  });

  it('uses LaunchDarkly ranking order when holdings values are equal', () => {
    const assetsByChain = createAssets({
      [BASE]: 100,
      [OPTIMISM]: 100,
      [ETHEREUM]: 0,
    });

    const result = getChainValueOrder(CHAIN_RANKING, assetsByChain, {});

    expect(getChainIds(result)).toEqual([
      BASE,
      OPTIMISM,
      ROBINHOOD,
      ETHEREUM,
      SOLANA,
    ]);
  });

  it('places a chain at its zero-based override position', () => {
    const assetsByChain = createAssets({
      [ROBINHOOD]: 500,
      [BASE]: 400,
      [OPTIMISM]: 300,
      [ETHEREUM]: 200,
      [SOLANA]: 100,
    });
    const positionOverrides: NetworkPositionOverrides = {
      [SOLANA]: { name: 'Solana', position: 1 },
    };

    const result = getChainValueOrder(
      CHAIN_RANKING,
      assetsByChain,
      positionOverrides,
    );

    expect(getChainIds(result)).toEqual([
      ROBINHOOD,
      SOLANA,
      BASE,
      OPTIMISM,
      ETHEREUM,
    ]);
  });

  it('leaves a chain in holdings order when its position exceeds the list', () => {
    const assetsByChain = createAssets({
      [BASE]: 300,
      [SOLANA]: 200,
      [ETHEREUM]: 100,
    });
    const positionOverrides: NetworkPositionOverrides = {
      [ETHEREUM]: { name: 'Ethereum', position: 5 },
    };

    const result = getChainValueOrder(
      CHAIN_RANKING,
      assetsByChain,
      positionOverrides,
    );

    expect(getChainIds(result)).toEqual([
      BASE,
      SOLANA,
      ETHEREUM,
      ROBINHOOD,
      OPTIMISM,
    ]);
  });

  it('keeps unsupported override chains out of the allowed chain list', () => {
    const assetsByChain = createAssets({
      [BASE]: 300,
      [SOLANA]: 200,
    });
    const positionOverrides: NetworkPositionOverrides = {
      ['eip155:999999' as CaipChainId]: {
        name: 'Unsupported',
        position: 0,
      },
    };

    const result = getChainValueOrder(
      CHAIN_RANKING,
      assetsByChain,
      positionOverrides,
    );

    expect(getChainIds(result)).toEqual([
      BASE,
      SOLANA,
      ROBINHOOD,
      OPTIMISM,
      ETHEREUM,
    ]);
  });

  it('groups same-position overrides by holdings value', () => {
    const assetsByChain = createAssets({
      [ROBINHOOD]: 500,
      [BASE]: 400,
      [OPTIMISM]: 300,
      [ETHEREUM]: 100,
      [SOLANA]: 200,
    });
    const positionOverrides: NetworkPositionOverrides = {
      [ETHEREUM]: { name: 'Ethereum', position: 1 },
      [SOLANA]: { name: 'Solana', position: 1 },
    };

    const result = getChainValueOrder(
      CHAIN_RANKING,
      assetsByChain,
      positionOverrides,
    );

    expect(getChainIds(result)).toEqual([
      ROBINHOOD,
      SOLANA,
      ETHEREUM,
      BASE,
      OPTIMISM,
    ]);
  });

  it('merges an override that overlaps another override group', () => {
    const assetsByChain = createAssets({
      [ROBINHOOD]: 500,
      [BASE]: 150,
      [OPTIMISM]: 300,
      [ETHEREUM]: 100,
      [SOLANA]: 200,
    });
    const positionOverrides: NetworkPositionOverrides = {
      [ETHEREUM]: { name: 'Ethereum', position: 1 },
      [SOLANA]: { name: 'Solana', position: 1 },
      [BASE]: { name: 'Base', position: 2 },
    };

    const result = getChainValueOrder(
      CHAIN_RANKING,
      assetsByChain,
      positionOverrides,
    );

    expect(getChainIds(result)).toEqual([
      ROBINHOOD,
      SOLANA,
      BASE,
      ETHEREUM,
      OPTIMISM,
    ]);
  });

  it('shifts an override group left when it extends beyond the list', () => {
    const assetsByChain = createAssets({
      [ROBINHOOD]: 500,
      [BASE]: 400,
      [OPTIMISM]: 300,
      [ETHEREUM]: 100,
      [SOLANA]: 200,
    });
    const positionOverrides: NetworkPositionOverrides = {
      [ETHEREUM]: { name: 'Ethereum', position: 4 },
      [SOLANA]: { name: 'Solana', position: 4 },
    };

    const result = getChainValueOrder(
      CHAIN_RANKING,
      assetsByChain,
      positionOverrides,
    );

    expect(getChainIds(result)).toEqual([
      ROBINHOOD,
      BASE,
      OPTIMISM,
      SOLANA,
      ETHEREUM,
    ]);
  });

  it('does not mutate chain ranking or position overrides', () => {
    const chainRanking = CHAIN_RANKING.map((chain) => ({ ...chain }));
    const positionOverrides: NetworkPositionOverrides = {
      [SOLANA]: { name: 'Solana', position: 0 },
    };
    const originalChainRanking = CHAIN_RANKING.map((chain) => ({
      ...chain,
    }));
    const originalPositionOverrides = {
      [SOLANA]: { name: 'Solana', position: 0 },
    };

    getChainValueOrder(chainRanking, {}, positionOverrides);

    expect(chainRanking).toEqual(originalChainRanking);
    expect(positionOverrides).toEqual(originalPositionOverrides);
  });
});
