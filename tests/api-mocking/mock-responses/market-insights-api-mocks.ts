/**
 * Mock data for Market Insights (AiDigestController / asset-summary) API endpoints.
 * The AiDigestService calls GET /api/v1/asset-summary?asset=<assetIdentifier>
 * and expects a { id, digest } envelope response.
 */

const marketInsightsEthDigest = {
  id: 'mock-digest-id-eth-001',
  digest: {
    asset: 'ETH',
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
      {
        name: 'CryptoNews',
        url: 'https://example.com',
        type: 'news',
      },
      {
        name: 'DeFiPulse',
        url: 'https://defipulse.com',
        type: 'data',
      },
    ],
  },
};

/**
 * Mock for a successful asset-summary response for ETH.
 * Matches any request to the digest asset-summary endpoint.
 */
export const marketInsightsWithData = {
  urlEndpoint: 'https://digest.api.cx.metamask.io/api/v1/asset-summary',
  response: marketInsightsEthDigest,
  responseCode: 200,
};

/**
 * Mock for a 404 response (no insights available for the asset).
 */
export const marketInsightsNoData = {
  urlEndpoint: 'https://digest.api.cx.metamask.io/api/v1/asset-summary',
  response: {},
  responseCode: 404,
};
