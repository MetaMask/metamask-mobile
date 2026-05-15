/**
 * Default mock responses for Polymarket API endpoints.
 *
 * These defaults cover the calls fired by the wallet's Explore tab
 * (TrendingView / usePredictMarketData) so that non-predict specs that pass
 * through Explore (e.g. via navigateToBrowserView()) don't leak live requests
 * to Polymarket. Predict and trending specs override these via
 * POLYMARKET_COMPLETE_MOCKS registered as testSpecificMock at higher priority.
 *
 * clob.polymarket.com is intentionally not covered here — it only fires on
 * trade actions, never during Explore render.
 */

/** Single source of truth for geoblock mock (eligible region). Reused in defaults and in POLYMARKET_COMPLETE_MOCKS. */
export const POLYMARKET_GEOBLOCK_ELIGIBLE = {
  urlEndpoint: 'https://polymarket.com/api/geoblock',
  responseCode: 200,
  response: {
    blocked: false,
    country: 'PT', // Portugal – not in GEO_BLOCKED_COUNTRIES
  },
} as const;

export const POLYMARKET_API_MOCKS = {
  GET: [
    POLYMARKET_GEOBLOCK_ELIGIBLE,
    // gamma-api: events pagination — consumer reads `data?.data`
    {
      urlEndpoint:
        /^https:\/\/gamma-api\.polymarket\.com\/events\/pagination(\?.*)?$/,
      responseCode: 200,
      response: { data: [] },
    },
    // gamma-api: public-search — consumer reads `data?.events`
    {
      urlEndpoint:
        /^https:\/\/gamma-api\.polymarket\.com\/public-search(\?.*)?$/,
      responseCode: 200,
      response: { events: [] },
    },
    {
      urlEndpoint: /^https:\/\/gamma-api\.polymarket\.com\/events\/\d+(\?.*)?$/,
      responseCode: 200,
      response: {
        id: '1',
        slug: 'mock-prediction-event',
        title: 'Mock prediction event',
        description: 'E2E mock event',
        icon: 'https://polymarket.com/icon.png',
        closed: false,
        series: [],
        markets: [],
        tags: [],
        liquidity: 0,
        volume: 0,
      },
    },
    // gamma-api: markets list
    {
      urlEndpoint: /^https:\/\/gamma-api\.polymarket\.com\/markets(\?.*)?$/,
      responseCode: 200,
      response: [],
    },
    // gamma-api: sports league team metadata (TeamsCache)
    {
      urlEndpoint: /^https:\/\/gamma-api\.polymarket\.com\/teams(\?.*)?$/,
      responseCode: 200,
      response: [],
    },
    // polymarket.com: homepage carousel
    {
      urlEndpoint: 'https://polymarket.com/api/homepage/carousel',
      responseCode: 200,
      response: [],
    },
    // polymarket.com: crypto price feed
    {
      urlEndpoint: /^https:\/\/polymarket\.com\/api\/crypto\/crypto-price.*$/,
      responseCode: 200,
      response: {},
    },
    // data-api: positions / activity / upnl
    {
      urlEndpoint: /^https:\/\/data-api\.polymarket\.com\/positions(\?.*)?$/,
      responseCode: 200,
      response: [],
    },
    {
      urlEndpoint: /^https:\/\/data-api\.polymarket\.com\/activity(\?.*)?$/,
      responseCode: 200,
      response: [],
    },
    {
      urlEndpoint: /^https:\/\/data-api\.polymarket\.com\/upnl(\?.*)?$/,
      responseCode: 200,
      response: [],
    },
  ],
  POST: [],
  PUT: [],
  DELETE: [],
  PATCH: [],
};
