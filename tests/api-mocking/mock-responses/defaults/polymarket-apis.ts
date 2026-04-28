/**
 * Default mock responses for Polymarket API endpoints
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

export const POLYMARKET_POSITIONS_EMPTY = {
  urlEndpoint: /^https:\/\/data-api\.polymarket\.com\/positions\b/,
  responseCode: 200,
  response: [],
} as const;

export const POLYMARKET_API_MOCKS = {
  GET: [POLYMARKET_GEOBLOCK_ELIGIBLE, POLYMARKET_POSITIONS_EMPTY],
  POST: [],
  PUT: [],
  DELETE: [],
  PATCH: [],
};
