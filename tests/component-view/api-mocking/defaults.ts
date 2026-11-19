/**
 * Neutral default API mocks shared by every component view test.
 *
 * Views routinely fire secondary requests (token metadata, spot prices,
 * favicon HEAD checks, account transactions) that a test does not assert on.
 * The net connect guard fails any test whose request has no mock, so those
 * incidental requests need an answer. The defaults here return empty or
 * minimal valid payloads — the same shape an empty server-side collection
 * would produce — so views render exactly what an empty result renders.
 *
 * Precedence: nock answers with the interceptor registered FIRST for a scope,
 * so a feature mock must exist before the defaults are (re)installed.
 * `installDefaultApiMocks()` therefore removes the defaults it installed
 * previously and registers them again, which puts them after every feature
 * interceptor registered in between. Feature setup helpers call it as their
 * last step, composed helpers re-call it after registering their extra
 * feature mocks, and `teardownNock()` reinstalls them after clearing. A
 * helper that forgets the final call leaves the defaults uninstalled and the
 * guard reports the blocked requests, so the mistake stays visible.
 *
 * The defaults are installed once per test file from `testSetupView.js`.
 * Registration cost is plain object creation, so reinstalling after each
 * mock teardown is negligible.
 */

// eslint-disable-next-line import-x/no-extraneous-dependencies
import nock from 'nock';

const TOKEN_API_ORIGIN = 'https://token.api.cx.metamask.io';
const TOKENS_API_ORIGIN = 'https://tokens.api.cx.metamask.io';
const PRICE_API_ORIGIN = 'https://price.api.cx.metamask.io';
const ACCOUNTS_API_ORIGIN = 'https://accounts.api.cx.metamask.io';
const STATIC_ICON_ORIGINS = [
  'https://static.cx.metamask.io',
  'https://uat-static.cx.metamask.io',
];
const BRIDGE_API_ORIGIN = 'https://bridge.dev-api.cx.metamask.io';
const STAKING_API_ORIGIN = 'https://staking.api.cx.metamask.io';
const SECURITY_ALERTS_API_ORIGIN = 'https://example.com';
const PRICE_ALERTS_API_ORIGIN = 'https://price-alerts.api.cx.metamask.io';

// A benign alert keeps the confirmations banner flow identical to a request
// the app never sees an alert for.
const NEUTRAL_SECURITY_ALERT = {
  block: 0,
  result_type: 'Benign',
  reason: 'not_applicable',
};

// The watchlist mirror treats an empty unprocessed list as full success.
const emptyWatchlistAlertsResult = {
  processedAssetIds: [],
  unprocessedAssetIds: [],
};

const emptyTransactionsResponse = {
  data: [],
  pageInfo: { count: 0, hasNextPage: false },
};

let installedDefaults: nock.Interceptor[] = [];

/** Nock's JSON body type; every default payload is plain JSON. */
type JsonBody = Record<string, unknown> | unknown[] | string;

const get = (origin: string, path: string, body: JsonBody, status = 200) => {
  const scope = nock(origin).persist();
  const interceptor = scope.get(path).query(true);
  interceptor.reply(status, body);
  installedDefaults.push(interceptor);
};

const getRegExp = (
  origin: string,
  path: RegExp,
  body: JsonBody,
  status = 200,
) => {
  const scope = nock(origin).persist();
  const interceptor = scope.get(path);
  interceptor.reply(status, body);
  installedDefaults.push(interceptor);
};

const post = (origin: string, path: string | RegExp, body: JsonBody) => {
  const scope = nock(origin).persist();
  const interceptor = scope.post(path);
  interceptor.reply(200, body);
  installedDefaults.push(interceptor);
};

const del = (origin: string, path: string, body: JsonBody) => {
  const scope = nock(origin).persist();
  const interceptor = scope.delete(path);
  interceptor.reply(200, body);
  installedDefaults.push(interceptor);
};

const headAny = (origin: string) => {
  const scope = nock(origin).persist();
  const interceptor = scope.head(/.*/);
  interceptor.reply(200, '');
  installedDefaults.push(interceptor);
};

const removeInstalledDefaults = (): void => {
  for (const interceptor of installedDefaults) {
    nock.removeInterceptor(interceptor);
  }
  installedDefaults = [];
};

/**
 * Installs the shared neutral mocks, replacing the ones installed earlier so
 * they sit after any feature mock registered in between. Call after feature
 * mocks are registered and after any `nock.cleanAll()`.
 */
export function installDefaultApiMocks(): void {
  removeInstalledDefaults();

  get(TOKEN_API_ORIGIN, '/assets', []);
  get(TOKEN_API_ORIGIN, '/v3/tokens/trending', []);
  get(TOKEN_API_ORIGIN, '/tokens/search', { count: 0, data: [] });
  get(TOKEN_API_ORIGIN, '/v1/rwas', {
    data: [],
    count: 0,
    totalCount: 0,
    pageInfo: { nextCursor: null, hasNextPage: false },
  });
  const sitesScope = nock('https://nft.api.cx.metamask.io').persist();
  const sitesInterceptor = sitesScope.get('/explore/sites').query(true);
  sitesInterceptor.reply(200, { dapps: [] });
  installedDefaults.push(sitesInterceptor);

  get(TOKENS_API_ORIGIN, '/v3/assets', []);

  get(PRICE_API_ORIGIN, '/v3/spot-prices', {});
  getRegExp(PRICE_API_ORIGIN, /\/v3\/historical-prices\//, { prices: [] });
  getRegExp(PRICE_API_ORIGIN, /\/v3\/ohlcv/, {
    data: [],
    hasNext: false,
    nextCursor: '',
  });
  get(PRICE_API_ORIGIN, '/v2/supportedNetworks', {
    fullSupport: [],
    partialSupport: [],
  });

  get(ACCOUNTS_API_ORIGIN, '/v5/multiaccount/transactions', {
    data: [],
    pageInfo: { count: 0, hasNextPage: false },
    unprocessedAccounts: [],
  });
  getRegExp(
    ACCOUNTS_API_ORIGIN,
    /\/v1\/accounts\/[^/]+\/transactions/,
    emptyTransactionsResponse,
  );
  // A missing transaction keeps the row exactly as it renders when the lookup
  // fails, which is how every existing suite already passes.
  getRegExp(
    ACCOUNTS_API_ORIGIN,
    /\/v1\/networks\/[^/]+\/transactions\/[^/]+/,
    {},
    404,
  );
  getRegExp(
    ACCOUNTS_API_ORIGIN,
    /\/v1\/networks\/[^/]+\/accounts\/[^/]+\/relationships\/[^/]+/,
    {},
  );

  for (const origin of STATIC_ICON_ORIGINS) {
    headAny(origin);
  }

  post(BRIDGE_API_ORIGIN, '/getTokens/popular', []);

  getRegExp(STAKING_API_ORIGIN, /\/v1\/lending\/[^/]+\/markets/, {
    markets: [],
  });
  getRegExp(STAKING_API_ORIGIN, /\/v1\/tron-staking\/[^/]+\/witnesses/, {
    data: [],
  });

  headAny(SECURITY_ALERTS_API_ORIGIN);
  post(SECURITY_ALERTS_API_ORIGIN, /\/validate\/[^/]+/, NEUTRAL_SECURITY_ALERT);

  get(PRICE_ALERTS_API_ORIGIN, '/v1/alerts/supported-chains', ['eip155:1']);
  post(
    PRICE_ALERTS_API_ORIGIN,
    '/v1/alerts/watchlist',
    emptyWatchlistAlertsResult,
  );
  del(
    PRICE_ALERTS_API_ORIGIN,
    '/v1/alerts/watchlist',
    emptyWatchlistAlertsResult,
  );
}
