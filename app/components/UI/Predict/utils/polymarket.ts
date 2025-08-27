export const getPolymarketEndpoints = (
  { isStaging = false }: { isStaging?: boolean } = { isStaging: false },
) => ({
  GAMMA_API_ENDPOINT: isStaging
    ? 'https://gamma-api-staging.polymarket.com'
    : 'https://gamma-api.polymarket.com',
  CLOB_ENDPOINT: isStaging
    ? 'https://clob-staging.polymarket.com'
    : 'https://clob.polymarket.com',
  DATA_API_ENDPOINT: isStaging
    ? 'https://data-api-staging.polymarket.com'
    : 'https://data-api.polymarket.com',
});
