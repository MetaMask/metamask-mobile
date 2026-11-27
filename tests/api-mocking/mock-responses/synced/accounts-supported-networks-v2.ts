import type { AccountsSupportedNetworksV2Response } from '../../api-response-types';

/**
 * Kept in sync with the live API by `yarn test:e2e:sync-api-mocks` (see
 * `api-mock-catalog.md`). The sync adds and removes fields and keeps the
 * values below, which tests assert on.
 */
export const ACCOUNTS_SUPPORTED_NETWORKS_V2 = {
  fullSupport: [
    'eip155:1',
    'eip155:137',
    'eip155:56',
    'eip155:59144',
    'eip155:8453',
    'eip155:10',
    'eip155:42161',
    'eip155:534352',
    'eip155:1329',
  ],
  partialSupport: ['eip155:42220', 'eip155:43114'],
} satisfies AccountsSupportedNetworksV2Response;
