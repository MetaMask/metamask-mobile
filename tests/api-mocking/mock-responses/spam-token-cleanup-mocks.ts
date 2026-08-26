/**
 * Mock responses for the AssetsController spam-asset cleanup that runs on
 * `KeyringController:unlock`.
 *
 * The cleanup reads two Token API endpoints:
 * 1. `GET token.api.cx.metamask.io/v1/suggestedOccurrenceFloors`
 * 2. `GET tokens.api.cx.metamask.io/v3/assets?assetIds=...&includeOccurrences=true`
 *
 * An asset is treated as spam when its `occurrences` falls below its chain's
 * floor. Every value below is the live API response, captured with:
 *
 * ```
 * curl 'https://token.api.cx.metamask.io/v1/suggestedOccurrenceFloors'
 * curl -G 'https://tokens.api.cx.metamask.io/v3/assets' \
 *   --data-urlencode 'assetIds=<ids>' --data-urlencode 'includeOccurrences=true'
 * ```
 */

import type { Mockttp } from 'mockttp';
import { getDecodedProxiedURL } from '../../smoke-appium/notifications/utils/helpers';

/**
 * Above the priority used by `setupMockRequest` (999) and the default `/proxy`
 * handler, which already answers `/v3/assets` with an empty array.
 */
const MOCK_OVERRIDE_PRIORITY = 1001;

const SUGGESTED_OCCURRENCE_FLOORS_PATH =
  'token.api.cx.metamask.io/v1/suggestedOccurrenceFloors';
const V3_ASSETS_PATH = 'tokens.api.cx.metamask.io/v3/assets';

/**
 * Chains missing from this map fall back to the controller's default floor of
 * 3, which is what BNB Chain (56) and Polygon (137) rely on below.
 */
const SUGGESTED_OCCURRENCE_FLOORS = {
  1: 3,
  143: 1,
  204: 1,
  232: 1,
  690: 1,
  1329: 1,
  4663: 1,
  10143: 1,
  59144: 1,
  98866: 1,
};

export interface TrackedAsset {
  assetId: `eip155:${string}/erc20:${string}`;
  name: string;
  symbol: string;
  decimals: number;
  /** `occurrences` as returned by `GET tokens.api.cx.metamask.io/v3/assets`. */
  occurrences: number;
  amount: string;
}

/**
 * Real airdropped spam tokens across Ethereum, BNB Chain and Polygon. All
 * eight sit below their chain's occurrence floor and must be cleaned up.
 */
export const SPAM_ASSETS: TrackedAsset[] = [
  {
    assetId: 'eip155:1/erc20:0xC12D1c73eE7DC3615BA4e37E4ABFdbDDFA38907E',
    name: 'KickToken',
    symbol: 'KICK',
    decimals: 8,
    occurrences: 1,
    amount: '888888',
  },
  {
    assetId: 'eip155:56/erc20:0xA1B99485D58D70D86E455Ab8823492090C3F43C0',
    name: 'Ape-Swap.io',
    symbol: 'APE',
    decimals: 18,
    occurrences: 1,
    amount: '350',
  },
  {
    assetId: 'eip155:56/erc20:0xD22202d23fE7dE9E3DbE11a2a88F42f4CB9507cf',
    name: 'Minereum BSC',
    symbol: 'MNEB',
    decimals: 8,
    occurrences: 1,
    amount: '150000',
  },
  {
    assetId: 'eip155:56/erc20:0x3c46e6A6a25bAe4520B6BEB545f31c5280FcC0f7',
    name: 'My Get Rich Token',
    symbol: 'MGRT',
    decimals: 18,
    occurrences: 1,
    amount: '120000.576',
  },
  {
    assetId: 'eip155:137/erc20:0xdC8Fa3FaB8421ff44cc6CA7f966673FF6c0B3B58',
    name: 'Draf.io',
    symbol: 'DRAF.IO',
    decimals: 18,
    occurrences: 1,
    amount: '288101',
  },
  {
    assetId: 'eip155:137/erc20:0x68CaF7335aA11188D9d91E1c9a5ab73a6de827bE',
    name: 'GrandpaGreen',
    symbol: 'GGREEN',
    decimals: 18,
    occurrences: 1,
    amount: '999',
  },
  {
    assetId: 'eip155:137/erc20:0xfAE400Bf04f88E47D899CFe7e7C16bf8c8AE919b',
    name: 'Pikatic',
    symbol: 'PKT',
    decimals: 18,
    occurrences: 1,
    amount: '220000',
  },
  {
    assetId: 'eip155:137/erc20:0x6b9a80572382159D3656ea43beA144f1151ccce7',
    name: 'Rotomico',
    symbol: 'RTM',
    decimals: 18,
    occurrences: 1,
    amount: '850000',
  },
];

/** Widely-listed token, well above the mainnet floor of 3. */
export const LEGITIMATE_ASSET: TrackedAsset = {
  assetId: 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  name: 'USDC',
  symbol: 'USDC',
  decimals: 6,
  occurrences: 10,
  amount: '250',
};

/**
 * Below the occurrence floor, but the user imported it by hand. Custom assets
 * are excluded from cleanup so that a deliberate import is never reverted.
 */
export const CUSTOM_ASSET: TrackedAsset = {
  assetId: 'eip155:56/erc20:0x9C121B7CB6C0CFBFbC1E1a73dd8D9172a79D399A',
  name: 'BananaCat',
  symbol: 'BCT',
  decimals: 18,
  occurrences: 1,
  amount: '42000',
};

export const TRACKED_ASSETS: TrackedAsset[] = [
  ...SPAM_ASSETS,
  LEGITIMATE_ASSET,
  CUSTOM_ASSET,
];

/**
 * Mocks the two Token API endpoints the spam cleanup depends on.
 *
 * The `/v3/assets` mock is scoped to `includeOccurrences=true` so it only
 * answers spam-filter lookups, leaving plain metadata lookups to the default
 * mock in `tests/api-mocking/mock-responses/defaults/token-apis.ts`.
 *
 * @param mockServer - Mockttp instance.
 * @param options - Mock options.
 * @param options.failOccurrenceFloors - Serve a 500 from
 * `/v1/suggestedOccurrenceFloors`, which makes the cleanup fail closed.
 */
export async function mockOccurrenceApis(
  mockServer: Mockttp,
  { failOccurrenceFloors = false }: { failOccurrenceFloors?: boolean } = {},
): Promise<void> {
  await mockServer
    .forGet('/proxy')
    .matching((request) =>
      getDecodedProxiedURL(request.url).includes(
        SUGGESTED_OCCURRENCE_FLOORS_PATH,
      ),
    )
    .asPriority(MOCK_OVERRIDE_PRIORITY)
    .always()
    .thenCallback(() =>
      failOccurrenceFloors
        ? { statusCode: 500, json: { message: 'Internal server error' } }
        : { statusCode: 200, json: SUGGESTED_OCCURRENCE_FLOORS },
    );

  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const url = new URL(getDecodedProxiedURL(request.url));
      return (
        url.href.includes(V3_ASSETS_PATH) &&
        url.searchParams.get('includeOccurrences') === 'true'
      );
    })
    .asPriority(MOCK_OVERRIDE_PRIORITY)
    .always()
    .thenCallback((request) => {
      const url = new URL(getDecodedProxiedURL(request.url));
      const requested = new Set(
        url.searchParams
          .getAll('assetIds')
          .flatMap((value) => value.split(','))
          .map((assetId) => assetId.toLowerCase()),
      );

      return {
        statusCode: 200,
        json: TRACKED_ASSETS.filter(({ assetId }) =>
          requested.has(assetId.toLowerCase()),
        ).map(({ assetId, name, symbol, decimals, occurrences }) => ({
          // The live API echoes asset IDs in lowercase.
          assetId: assetId.toLowerCase(),
          name,
          symbol,
          decimals,
          occurrences,
        })),
      };
    });
}
