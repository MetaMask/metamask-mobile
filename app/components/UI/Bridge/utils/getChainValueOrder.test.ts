import { CaipChainId } from '@metamask/utils';
import type { PromotedChain } from '../../../../selectors/featureFlagController/swapsChainValueOrderOverride';
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

    const result = getChainValueOrder(CHAIN_RANKING, assetsByChain, []);

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

    const result = getChainValueOrder(CHAIN_RANKING, assetsByChain, []);

    expect(getChainIds(result)).toEqual([
      BASE,
      OPTIMISM,
      ROBINHOOD,
      ETHEREUM,
      SOLANA,
    ]);
  });

  it('promotes a single chain to the front and keeps holdings order for the rest', () => {
    const assetsByChain = createAssets({
      [ROBINHOOD]: 500,
      [BASE]: 400,
      [OPTIMISM]: 300,
      [ETHEREUM]: 200,
      [SOLANA]: 100,
    });
    const promotedChains: PromotedChain[] = [
      { chainId: SOLANA, name: 'Solana' },
    ];

    const result = getChainValueOrder(
      CHAIN_RANKING,
      assetsByChain,
      promotedChains,
    );

    expect(getChainIds(result)).toEqual([
      SOLANA,
      ROBINHOOD,
      BASE,
      OPTIMISM,
      ETHEREUM,
    ]);
  });

  it('promotes multiple chains to the front in array order', () => {
    const assetsByChain = createAssets({
      [ROBINHOOD]: 500,
      [BASE]: 400,
      [OPTIMISM]: 300,
      [ETHEREUM]: 200,
      [SOLANA]: 100,
    });
    const promotedChains: PromotedChain[] = [
      { chainId: SOLANA, name: 'Solana' },
      { chainId: ETHEREUM, name: 'Ethereum' },
    ];

    const result = getChainValueOrder(
      CHAIN_RANKING,
      assetsByChain,
      promotedChains,
    );

    expect(getChainIds(result)).toEqual([
      SOLANA,
      ETHEREUM,
      ROBINHOOD,
      BASE,
      OPTIMISM,
    ]);
  });

  it('leaves holdings order unchanged when the promoted chain is already first', () => {
    const assetsByChain = createAssets({
      [BASE]: 300,
      [SOLANA]: 200,
      [ETHEREUM]: 100,
    });
    const promotedChains: PromotedChain[] = [{ chainId: BASE, name: 'Base' }];

    const result = getChainValueOrder(
      CHAIN_RANKING,
      assetsByChain,
      promotedChains,
    );

    expect(getChainIds(result)).toEqual([
      BASE,
      SOLANA,
      ETHEREUM,
      ROBINHOOD,
      OPTIMISM,
    ]);
  });

  it('skips unsupported promoted chains and still promotes later valid entries', () => {
    const assetsByChain = createAssets({
      [BASE]: 300,
      [SOLANA]: 200,
    });
    const promotedChains: PromotedChain[] = [
      { chainId: 'eip155:999999' as CaipChainId, name: 'Unsupported' },
      { chainId: SOLANA, name: 'Solana' },
    ];

    const result = getChainValueOrder(
      CHAIN_RANKING,
      assetsByChain,
      promotedChains,
    );

    expect(getChainIds(result)).toEqual([
      SOLANA,
      BASE,
      ROBINHOOD,
      OPTIMISM,
      ETHEREUM,
    ]);
  });

  it('leaves holdings order unchanged for an empty promotion list', () => {
    const assetsByChain = createAssets({
      [BASE]: 300,
      [SOLANA]: 200,
      [ETHEREUM]: 100,
    });

    const result = getChainValueOrder(CHAIN_RANKING, assetsByChain, []);

    expect(getChainIds(result)).toEqual([
      BASE,
      SOLANA,
      ETHEREUM,
      ROBINHOOD,
      OPTIMISM,
    ]);
  });

  it('does not mutate chain ranking or promoted chains', () => {
    const chainRanking = CHAIN_RANKING.map((chain) => ({ ...chain }));
    const promotedChains: PromotedChain[] = [
      { chainId: SOLANA, name: 'Solana' },
    ];
    const originalChainRanking = CHAIN_RANKING.map((chain) => ({
      ...chain,
    }));
    const originalPromotedChains = [{ chainId: SOLANA, name: 'Solana' }];

    getChainValueOrder(chainRanking, {}, promotedChains);

    expect(chainRanking).toEqual(originalChainRanking);
    expect(promotedChains).toEqual(originalPromotedChains);
  });
});
