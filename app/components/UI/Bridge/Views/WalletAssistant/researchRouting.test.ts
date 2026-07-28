import type { TrendingAsset } from '@metamask/assets-controllers';

import {
  applyResearchPlanIdentity,
  buildLocalMarketListResponse,
  buildLocalPriceResponse,
  buildResearchPlan,
  getResearchPlanInstructions,
  isLocalMarketListRequest,
} from './researchRouting';

const MARKET_TOKENS: TrendingAsset[] = [
  {
    aggregatedUsdVolume: 1_000,
    assetId: 'eip155:1/erc20:0xaaa',
    decimals: 18,
    marketCap: 10_000,
    name: 'Alpha',
    price: '2',
    priceChangePct: { h24: '4.5' },
    symbol: 'AAA',
  },
  {
    aggregatedUsdVolume: 2_000,
    assetId: 'eip155:8453/erc20:0xbbb',
    decimals: 18,
    marketCap: 20_000,
    name: 'Beta',
    price: '3',
    priceChangePct: { h24: '-8.25' },
    symbol: 'BBB',
  },
];

describe('researchRouting', () => {
  it('routes direct trades without web research', () => {
    expect(buildResearchPlan('Buy 0.1 ETH with USDC')).toEqual(
      expect.objectContaining({
        intent: 'trade',
        useWebSearch: false,
      }),
    );
  });

  it('routes risk research to a deeper search', () => {
    expect(buildResearchPlan('Is $PEPE risky?')).toEqual(
      expect.objectContaining({
        assetHints: [
          expect.objectContaining({
            symbol: 'PEPE',
          }),
        ],
        intent: 'risk',
        searchContextSize: 'medium',
        useWebSearch: true,
      }),
    );
  });

  it('anchors a token to Robinhood Chain instead of the company', () => {
    const plan = buildResearchPlan(
      'Research CASHCAT on Robinhood Chain at 0x020b1234567890123456789012345678901218b4',
    );

    expect(plan).toEqual(
      expect.objectContaining({
        intent: 'project_overview',
        network: {
          caipChainId: 'eip155:4663',
          name: 'Robinhood Chain',
        },
      }),
    );
    expect(plan.assetHints).toContainEqual({
      contractAddress: '0x020b1234567890123456789012345678901218b4',
      network: {
        caipChainId: 'eip155:4663',
        name: 'Robinhood Chain',
      },
      symbol: 'CASHCAT',
    });
    expect(getResearchPlanInstructions(plan)).toContain(
      'Only include assets deployed on this network.',
    );
  });

  it('recognizes comparisons and common asset names', () => {
    const plan = buildResearchPlan('Compare Ethereum versus Bitcoin');

    expect(plan.intent).toBe('comparison');
    expect(plan.assetHints.map(({ symbol }) => symbol)).toEqual(['BTC', 'ETH']);
    expect(plan.searchContextSize).toBe('medium');
  });

  it('does not search the web for general conversation', () => {
    expect(buildResearchPlan('Hello there')).toEqual(
      expect.objectContaining({
        intent: 'general',
        useWebSearch: false,
      }),
    );
  });

  it('builds a local market-data response for one-token price questions', () => {
    const response = buildLocalPriceResponse(
      buildResearchPlan('What is the price of ETH?'),
      'What is the price of ETH?',
    );

    expect(response).toEqual(
      expect.objectContaining({
        title: 'ETH price',
        tokens: ['ETH'],
        assets: [
          expect.objectContaining({
            symbol: 'ETH',
          }),
        ],
      }),
    );
    expect(response?.summary).toBe('ETH');
    expect(response?.summary).not.toMatch(/\$[\d,.]+/);
  });

  it('does not bypass research for complex, multi-token, or non-price questions', () => {
    expect(
      buildLocalPriceResponse(
        buildResearchPlan('Compare the price of ETH and BTC'),
        'Compare the price of ETH and BTC',
      ),
    ).toBeUndefined();
    expect(
      buildLocalPriceResponse(
        buildResearchPlan('What is the ETH price chart?'),
        'What is the ETH price chart?',
      ),
    ).toBeUndefined();
    expect(
      buildLocalPriceResponse(
        buildResearchPlan('Is ETH risky?'),
        'Is ETH risky?',
      ),
    ).toBeUndefined();
  });

  it('builds trending and mover lists from MetaMask market data', () => {
    expect(
      buildLocalMarketListResponse('What tokens are trending?', MARKET_TOKENS),
    ).toEqual(
      expect.objectContaining({
        title: 'Trending tokens',
        tokens: ['AAA', 'BBB'],
      }),
    );
    expect(
      buildLocalMarketListResponse('Show me the top gainers', MARKET_TOKENS),
    ).toEqual(
      expect.objectContaining({
        title: 'Top crypto gainers',
        tokens: ['AAA'],
      }),
    );
    expect(
      buildLocalMarketListResponse('Show me the top losers', MARKET_TOKENS),
    ).toEqual(
      expect.objectContaining({
        title: 'Top crypto losers',
        tokens: ['BBB'],
      }),
    );
  });

  it('keeps contextual discovery questions on the research path', () => {
    expect(isLocalMarketListRequest('What tokens are trending?')).toBe(true);
    expect(isLocalMarketListRequest('Why are memecoins trending?')).toBe(false);
    expect(
      isLocalMarketListRequest('Trending tokens under $50M market cap'),
    ).toBe(false);
  });

  it('applies explicit network and contract identity to the response', () => {
    const plan = buildResearchPlan(
      'Research CASHCAT on Robinhood Chain at 0x020b1234567890123456789012345678901218b4',
    );
    const research = {
      asOf: '',
      assets: [
        {
          chainId: 'eip155:1',
          contractAddress: '0x1111111111111111111111111111111111111111',
          name: 'Wrong Cashcat',
          network: 'Ethereum',
          symbol: 'CASHCAT',
        },
      ],
      chart: { labels: [], sourceIds: [], title: '', unit: '', values: [] },
      sections: [],
      sources: [],
      summary: '',
      swapIntent: {
        amountType: 'unspecified' as const,
        amountValue: '',
        enabled: false,
        mode: 'real' as const,
        network: '',
        sourceAmount: '',
        sourceSymbol: '',
        destinationSymbol: '',
      },
      title: '',
      tokens: ['CASHCAT'],
    };

    expect(applyResearchPlanIdentity(plan, research).assets).toEqual([
      {
        chainId: 'eip155:4663',
        contractAddress: '0x020b1234567890123456789012345678901218b4',
        name: '',
        network: 'Robinhood Chain',
        symbol: 'CASHCAT',
      },
    ]);
  });
});
