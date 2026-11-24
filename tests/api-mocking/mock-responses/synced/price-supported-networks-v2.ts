import type { PriceSupportedNetworksV2Response } from '../../api-response-types';

/**
 * Kept in sync with the live API by `yarn test:e2e:sync-api-mocks` (see
 * `api-mock-catalog.md`). The sync adds and removes fields and keeps the
 * values below, which tests assert on.
 */
export const PRICE_SUPPORTED_NETWORKS_V2 = {
  fullSupport: [
    'eip155:1',
    'eip155:10',
    'eip155:56',
    'eip155:137',
    'eip155:42161',
    'eip155:43114',
    'eip155:8453',
    'eip155:59144',
    'eip155:324',
    'eip155:534352',
    'eip155:1101',
    'eip155:1284',
    'eip155:1285',
    'eip155:100',
    'eip155:250',
    'eip155:1313161554',
    'eip155:25',
    'eip155:42220',
    'eip155:288',
    'eip155:2222',
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    'bip122:000000000019d6689c085ae165831e93',
  ],
  partialSupport: {
    spotPricesV2: [],
    spotPricesV3: [],
  },
} satisfies PriceSupportedNetworksV2Response;
