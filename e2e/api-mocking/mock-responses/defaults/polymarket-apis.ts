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
  ],
  POST: [],
  PUT: [],
  DELETE: [],
  PATCH: [],
};
