/**
 * Flags inline mocks for endpoints defined in `api-mocks.ts`. Spec-level mocks
 * for those endpoints must be built with `endpoint.mock()` / `endpoint.register()`
 * so they are checked against the consumer type and start from the synced body.
 *
 * The scan is textual and deliberately cheap: it looks for the endpoint's URL
 * in files that register mocks. Files that still mock a catalogued endpoint
 * inline are listed in `NOT_MIGRATED` with the reason. The list can only
 * shrink: a migrated file left in it fails the test too.
 */
/* eslint-disable import-x/no-nodejs-modules */
import fs from 'fs';
import path from 'path';
import { API_MOCKS } from './api-mocks.ts';

const TESTS_ROOT = path.resolve(__dirname, '..');

const SCANNED_DIRS = [
  'smoke-appium',
  'helpers',
  'api-mocking/helpers',
  'api-mocking/mock-responses',
];

/**
 * The default mocks and the typed definitions are where the URLs live.
 * `mockHelpers.ts` registers the global accounts supported-networks default
 * from its definition.
 */
const EXCLUDED_PREFIXES = [
  'api-mocking/mock-responses/defaults/',
  'api-mocking/mock-responses/synced/',
  'api-mocking/helpers/mockHelpers.ts',
  'api-mocking/api-mocks',
  'api-mocking/define-api-mock',
];

/** Source text (backslashes removed) that identifies an inline mock per endpoint. */
const INLINE_MOCK_PATTERNS: Record<keyof typeof API_MOCKS, RegExp> = {
  priceSpotPricesV3: /price\.api\.cx\.metamask\.io\/v3\/spot-prices/,
  priceExchangeRatesV1: /price\.api\.cx\.metamask\.io\/v1\/exchange-rates/,
  accountsSupportedNetworksV2:
    /accounts\.api\.cx\.metamask\.io\/v2\/supportedNetworks/,
  accountsActiveNetworksV2:
    /accounts\.api\.cx\.metamask\.io\/v2\/activeNetworks/,
  tokenSupportedNetworksV2:
    /tokens?\.api\.cx\.metamask\.io\/v2\/supportedNetworks/,
  tokensAssetsV3: /tokens\.api\.cx\.metamask\.io\/v3\/assets/,
  bridgeGetTokens: /url:\s*\/getTokens\.\*chainId/,
  bridgeGetTxStatus: /url:\s*\/getTxStatus\//,
  gasSuggestedGasFees: /gas\.api\.cx\.metamask\.io\/networks/,
  rampsCountriesV2:
    /on-ramp-cache\.(api|dev-api|uat-api)\.cx\.metamask\.io\/v2\/regions\/countries/,
  contentfulBanners: /contentful\.com\.\*promotionalBanner/,
};

/**
 * Files that still mock a catalogued endpoint inline, with the endpoints they
 * mock. Migrate them to the helper and remove the entry.
 */
const NOT_MIGRATED: Record<string, (keyof typeof API_MOCKS)[]> = {
  // Migrated together with the accounts balances endpoints.
  'smoke-appium/confirmations/send/send-erc20-token.spec.ts': [
    'priceSpotPricesV3',
    'tokenSupportedNetworksV2',
    'tokensAssetsV3',
  ],
  'api-mocking/mock-responses/earn/lending-mocks.ts': [
    'priceSpotPricesV3',
    'tokenSupportedNetworksV2',
    'tokensAssetsV3',
  ],
  'api-mocking/helpers/contentfulHelper.ts': ['contentfulBanners'],
  // Callbacks that branch on `vsCurrency` and add chain-specific entries.
  'api-mocking/mock-responses/pay/money-account-deposit-mocks.ts': [
    'priceSpotPricesV3',
    'priceExchangeRatesV1',
    'accountsActiveNetworksV2',
  ],
  'api-mocking/mock-responses/pay/money-account-withdraw-mocks.ts': [
    'priceSpotPricesV3',
    'priceExchangeRatesV1',
    'accountsActiveNetworksV2',
  ],
  'api-mocking/mock-responses/pay/perps-deposit-mocks.ts': [
    'priceSpotPricesV3',
    'priceExchangeRatesV1',
    'accountsActiveNetworksV2',
  ],
  'api-mocking/mock-responses/pay/perps-withdraw-mocks.ts': [
    'priceSpotPricesV3',
    'priceExchangeRatesV1',
    'accountsActiveNetworksV2',
  ],
  'api-mocking/mock-responses/pay/predict-deposit-mocks.ts': [
    'priceSpotPricesV3',
    'priceExchangeRatesV1',
    'accountsActiveNetworksV2',
  ],
  'api-mocking/mock-responses/pay/predict-withdraw-mocks.ts': [
    'priceSpotPricesV3',
    'priceExchangeRatesV1',
    'accountsActiveNetworksV2',
  ],
  // Filters the response by the `assetIds` query parameter.
  'api-mocking/mock-responses/spam-token-cleanup-mocks.ts': ['tokensAssetsV3'],
};

const collectSourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return collectSourceFiles(fullPath);
    }
    return /\.tsx?$/u.test(entry.name) && !/\.test\.tsx?$/u.test(entry.name)
      ? [fullPath]
      : [];
  });

const findInlineMocks = (): Record<string, string[]> => {
  const found: Record<string, string[]> = {};
  for (const dir of SCANNED_DIRS) {
    for (const file of collectSourceFiles(path.join(TESTS_ROOT, dir))) {
      const relative = path
        .relative(TESTS_ROOT, file)
        .split(path.sep)
        .join('/');
      if (EXCLUDED_PREFIXES.some((prefix) => relative.startsWith(prefix))) {
        continue;
      }
      const source = fs.readFileSync(file, 'utf8').replace(/\\/gu, '');
      const matches = Object.entries(INLINE_MOCK_PATTERNS)
        .filter(([, pattern]) => pattern.test(source))
        .map(([name]) => name);
      if (matches.length > 0) {
        found[relative] = matches.sort();
      }
    }
  }
  return found;
};

describe('E2E API mock definitions', () => {
  const inlineMocks = findInlineMocks();

  it('has an inline-mock pattern for every defined endpoint', () => {
    expect(Object.keys(INLINE_MOCK_PATTERNS).sort()).toEqual(
      Object.keys(API_MOCKS).sort(),
    );
  });

  it('has no inline mock of a defined endpoint outside the known list', () => {
    const unexpected = Object.entries(inlineMocks)
      .filter(([file]) => !(file in NOT_MIGRATED))
      .map(([file, names]) => `${file}: ${names.join(', ')}`);

    expect(unexpected).toEqual([]);
  });

  it('lists only files that still mock a defined endpoint inline', () => {
    const stale = Object.entries(NOT_MIGRATED)
      .filter(([file, names]) => {
        const actual = inlineMocks[file] ?? [];
        return JSON.stringify(actual) !== JSON.stringify([...names].sort());
      })
      .map(([file]) => file);

    expect(stale).toEqual([]);
  });
});
