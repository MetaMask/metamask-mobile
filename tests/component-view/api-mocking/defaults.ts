/**
 * Neutral default API mocks shared by every component view test: secondary
 * requests (token metadata, spot prices, charts, favicon HEAD checks,
 * account transactions) that a test does not assert on get empty or minimal
 * payloads, so views render exactly what an empty result renders.
 *
 * Precedence: nock answers with the interceptor registered FIRST for a scope,
 * so a feature mock must exist before the defaults are (re)installed —
 * `installDefaultApiMocks()` removes and re-registers them, putting them
 * after every feature interceptor registered in between. Feature setup
 * helpers call it last and `teardownNock()` reinstalls them after clearing;
 * a helper that forgets leaves the requests blocked and visible to the
 * guard.
 */

// eslint-disable-next-line import-x/no-extraneous-dependencies
import nock from 'nock';
import AppConstants from '../../../app/core/AppConstants';
import { BRIDGE_API_BASE_URL } from '../../../app/constants/bridge';
import { PRICE_API_BASE_URL } from '../../../app/constants/urls';
import { TOKEN_API_BASE_URL } from '../../../app/components/UI/Assets/watchlist/utils/getTokens';

// Origins the app itself derives from shared constants follow the same source
// here, so a different METAMASK_ENVIRONMENT (or security-alerts URL) cannot
// quietly detach the defaults from what the views request.
const TOKEN_API_ORIGIN = TOKEN_API_BASE_URL;
const TOKENS_API_ORIGIN = 'https://tokens.api.cx.metamask.io';
const PRICE_API_ORIGIN = PRICE_API_BASE_URL;
const ACCOUNTS_API_ORIGIN = 'https://accounts.api.cx.metamask.io';
const STATIC_ICON_ORIGINS = [
  'https://static.cx.metamask.io',
  'https://uat-static.cx.metamask.io',
];
const BRIDGE_API_ORIGIN = BRIDGE_API_BASE_URL;
const STAKING_API_ORIGIN = 'https://staking.api.cx.metamask.io';
const SECURITY_ALERTS_API_ORIGIN =
  process.env.SECURITY_ALERTS_API_URL ?? 'https://example.com';
const PRICE_ALERTS_API_ORIGIN = AppConstants.PRICE_ALERTS_API.URL;
// No app-side constants exist for the origins below; they are pinned to the
// hosts the views request in tests (the same values the feature helpers pin).
// The Ramp SDK re-fetches its country cache when a deeplink intent settles and
// aborts in-flight requests around unmount, so the re-fired request can land
// after a test's ramp mocks are torn down. Answer it neutrally so the
// straggler cannot surface as an unmocked request.
const ON_RAMP_CACHE_ORIGINS = [
  'https://on-ramp-cache.uat-api.cx.metamask.io',
  'https://on-ramp-cache.api.cx.metamask.io',
];
const NEUTRAL_RAMP_COUNTRY_CACHE = { payments: [], crypto: [], fiat: [] };

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

/** Registers one persisted default and tracks it for the next install. */
const add = (
  method: 'get' | 'post' | 'delete' | 'head',
  origin: string,
  path: string | RegExp,
  body: JsonBody,
  status = 200,
): void => {
  const scope = nock(origin).persist();
  const interceptor = scope[method](path);
  if (method === 'get' && typeof path === 'string') {
    interceptor.query(true);
  }
  interceptor.reply(status, body);
  installedDefaults.push(interceptor);
};

const removeInstalledDefaults = (): void => {
  for (const interceptor of installedDefaults) {
    nock.removeInterceptor(interceptor);
  }
  installedDefaults = [];
};

/** Installs the shared neutral mocks behind any feature mock registered
 * since the last install. */
export function installDefaultApiMocks(): void {
  removeInstalledDefaults();

  add('get', TOKEN_API_ORIGIN, '/assets', []);
  add('get', TOKEN_API_ORIGIN, '/v3/tokens/trending', []);
  add('get', TOKEN_API_ORIGIN, '/v3/tokens/top-gainers', []);
  add('get', TOKEN_API_ORIGIN, '/v3/tokens/popular', []);
  add('get', TOKEN_API_ORIGIN, '/tokens/search', { count: 0, data: [] });
  add('get', TOKEN_API_ORIGIN, '/v1/rwas', {
    data: [],
    count: 0,
    totalCount: 0,
    pageInfo: { nextCursor: null, hasNextPage: false },
  });
  add('get', 'https://nft.api.cx.metamask.io', '/explore/sites', {
    dapps: [],
  });

  add('get', TOKENS_API_ORIGIN, '/v3/assets', []);

  add('get', PRICE_API_ORIGIN, '/v3/spot-prices', {});
  add('get', PRICE_API_ORIGIN, /\/v3\/historical-prices\//, { prices: [] });
  add('get', PRICE_API_ORIGIN, /\/v3\/ohlcv/, {
    data: [],
    hasNext: false,
    nextCursor: '',
  });
  add('get', PRICE_API_ORIGIN, '/v2/supportedNetworks', {
    fullSupport: [],
    partialSupport: [],
  });

  add('get', ACCOUNTS_API_ORIGIN, '/v5/multiaccount/transactions', {
    data: [],
    pageInfo: { count: 0, hasNextPage: false },
    unprocessedAccounts: [],
  });
  add(
    'get',
    ACCOUNTS_API_ORIGIN,
    /\/v1\/accounts\/[^/]+\/transactions/,
    emptyTransactionsResponse,
  );
  // A missing transaction keeps the row exactly as it renders when the lookup
  // fails, which is how every existing suite already passes.
  add(
    'get',
    ACCOUNTS_API_ORIGIN,
    /\/v5\/accounts\/[^/]+\/transactions\/[^/]+/,
    {},
    404,
  );
  add(
    'get',
    ACCOUNTS_API_ORIGIN,
    /\/v1\/networks\/[^/]+\/accounts\/[^/]+\/relationships\/[^/]+/,
    {},
  );

  for (const origin of STATIC_ICON_ORIGINS) {
    add('head', origin, /.*/, '');
  }

  add('post', BRIDGE_API_ORIGIN, '/getTokens/popular', []);

  add('get', STAKING_API_ORIGIN, /\/v1\/lending\/[^/]+\/markets/, {
    markets: [],
  });
  add('get', STAKING_API_ORIGIN, /\/v1\/tron-staking\/[^/]+\/witnesses/, {
    data: [],
  });

  add('head', SECURITY_ALERTS_API_ORIGIN, /.*/, '');
  add(
    'post',
    SECURITY_ALERTS_API_ORIGIN,
    /\/validate\/[^/]+/,
    NEUTRAL_SECURITY_ALERT,
  );

  add('get', PRICE_ALERTS_API_ORIGIN, '/v1/alerts/supported-chains', [
    'eip155:1',
  ]);
  add(
    'post',
    PRICE_ALERTS_API_ORIGIN,
    '/v1/alerts/watchlist',
    emptyWatchlistAlertsResult,
  );
  add(
    'delete',
    PRICE_ALERTS_API_ORIGIN,
    '/v1/alerts/watchlist',
    emptyWatchlistAlertsResult,
  );

  for (const origin of ON_RAMP_CACHE_ORIGINS) {
    add('get', origin, '/regions/countries', []);
    add('get', origin, /^\/regions\/.*\/light/, NEUTRAL_RAMP_COUNTRY_CACHE);
  }
}
