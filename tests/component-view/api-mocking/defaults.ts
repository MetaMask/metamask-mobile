/**
 * Neutral default API mocks shared by every component view test.
 *
 * Views routinely fire secondary requests (token metadata, spot prices,
 * charts, favicon HEAD checks, account transactions) that a test does not
 * assert on. The net connect guard fails any test whose request has no mock,
 * so those incidental requests need an answer. The defaults here return
 * empty or minimal valid payloads, so views render exactly what an empty
 * result renders.
 *
 * Precedence: nock answers with the interceptor registered FIRST for a scope,
 * so a feature mock must exist before the defaults are (re)installed.
 * `installDefaultApiMocks()` removes the defaults it installed previously and
 * registers them again, which puts them after every feature interceptor
 * registered in between. Feature setup helpers call it as their last step,
 * composed helpers re-call it after registering their extra feature mocks,
 * and `teardownNock()` reinstalls them after clearing. A helper that forgets
 * the final call leaves the defaults uninstalled and the guard reports the
 * blocked requests, so the mistake stays visible.
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

/** Origins the shared defaults answer; used to detect a wiped state. */
export const DEFAULT_ORIGINS = [
  TOKEN_API_ORIGIN,
  TOKENS_API_ORIGIN,
  PRICE_API_ORIGIN,
  ACCOUNTS_API_ORIGIN,
  ...STATIC_ICON_ORIGINS,
  BRIDGE_API_ORIGIN,
  STAKING_API_ORIGIN,
  SECURITY_ALERTS_API_ORIGIN,
  PRICE_ALERTS_API_ORIGIN,
];

/**
 * Re-arms the shared defaults when everything was wiped — an anomalous state
 * (interceptors are lost to an unexplained module duplication in some Jest
 * workers). Returns true when a re-arm happened, so the caller can treat the
 * triggering request as lost to the anomaly instead of uncovered.
 */
export function rearmDefaultMocksIfWiped(): boolean {
  if (nock.activeMocks().length > 0) {
    return false;
  }
  installDefaultApiMocks();
  return true;
}

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
    /\/v1\/networks\/[^/]+\/transactions\/[^/]+/,
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
}
