import Engine from '../../../app/core/Engine';

export const MOCK_PERPS_MARKET_INSIGHTS_REPORT = {
  asset: 'ETH',
  digestId: 'mock-digest-id-eth-perps-001',
  generatedAt: '2026-04-08T10:00:00.000Z',
  headline: 'Ethereum shows strong momentum amid institutional demand',
  summary:
    'Ethereum continues to attract institutional interest with increasing on-chain activity and a healthy DeFi ecosystem.',
  trends: [
    {
      title: 'Institutional Adoption',
      description:
        'Large institutions continue to accumulate ETH as a treasury asset following ETF approvals.',
      category: 'macro',
      impact: 'positive',
      articles: [
        {
          title: 'Spot Ethereum ETFs See Record Weekly Inflows',
          url: 'https://example.com/eth-etf-inflows',
          source: 'CryptoNews',
          date: '2026-04-07T09:00:00.000Z',
        },
      ],
      tweets: [
        {
          contentSummary:
            'ETH institutional demand is at all-time highs this quarter.',
          url: 'https://x.com/example/status/123456789',
          author: '@cryptoanalyst',
          date: '2026-04-07T08:30:00.000Z',
        },
      ],
    },
    {
      title: 'DeFi Activity Surge',
      description:
        'On-chain DeFi volumes have increased significantly, driving ETH utility and burn rate.',
      category: 'technical',
      impact: 'positive',
      articles: [
        {
          title: 'Ethereum DeFi TVL Hits New Milestone',
          url: 'https://example.com/defi-tvl',
          source: 'DeFiPulse',
          date: '2026-04-06T14:00:00.000Z',
        },
      ],
      tweets: [],
    },
  ],
  social: [],
  sources: [
    { name: 'CryptoNews', url: 'https://example.com', type: 'news' },
    { name: 'DeFiPulse', url: 'https://defipulse.com', type: 'data' },
  ],
};

export const OPEN_POSITION_STREAM_ITEM = {
  symbol: 'ETH',
  size: '2.5',
  marginUsed: '500',
  entryPrice: '2000',
  liquidationPrice: '1900',
  unrealizedPnl: '100',
  returnOnEquity: '0.20',
  leverage: { value: 10, type: 'isolated' as const },
  cumulativeFunding: {
    sinceOpen: '5',
    allTime: '10',
    sinceChange: '2',
  },
  positionValue: '5000',
  maxLeverage: 50,
  takeProfitCount: 0,
  stopLossCount: 0,
};

export function setupPerpsMarketInsightsEngineMock(
  report: typeof MOCK_PERPS_MARKET_INSIGHTS_REPORT | null,
) {
  (
    Engine as unknown as {
      context: {
        AiDigestController?: { fetchMarketInsights: jest.Mock };
        RampsController?: { setSelectedToken: jest.Mock };
      };
    }
  ).context.AiDigestController = {
    fetchMarketInsights: jest.fn().mockResolvedValue(report),
  };

  (
    Engine as unknown as {
      context: {
        RampsController?: { setSelectedToken: jest.Mock };
      };
    }
  ).context.RampsController = {
    setSelectedToken: jest.fn(),
  };
}

/** Same engine wiring as Perps insights; use for token Asset Details + MarketInsightsView CV tests. */
export const setupMarketInsightsEngineMock = setupPerpsMarketInsightsEngineMock;
