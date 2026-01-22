/**
 * Default mock responses for Polymarket API endpoints
 */

export const POLYMARKET_API_MOCKS = {
  GET: [
    {
      urlEndpoint: 'https://polymarket.com/api/geoblock',
      responseCode: 200,
      response: {
        blocked: false, // Set to false to allow access in tests
      },
    },
    {
      urlEndpoint:
        'https://tx-sentinel-polygon-mainnet.api.cx.metamask.io/network',
      responseCode: 200,
      response: {
        name: 'Polygon Mainnet',
        group: 'polygon',
        chainID: 137,
        nativeCurrency: {
          name: 'POL',
          symbol: 'POL',
          decimals: 18,
        },
        network: 'polygon-mainnet',
        explorer: 'https://polygonscan.com/',
        confirmations: true,
        smartTransactions: false,
        relayTransactions: true,
        hidden: false,
        sendBundle: false,
      },
    },
  ],
  POST: [],
  PUT: [],
  DELETE: [],
  PATCH: [],
};
