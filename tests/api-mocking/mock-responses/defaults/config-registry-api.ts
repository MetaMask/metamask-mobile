import { MockEventsObject } from '../../../framework';

/**
 * Default mock for the config-registry `/v1/config/networks` endpoint used by
 * `ConfigRegistryController` (via `ConfigRegistryApiService`). The controller
 * starts polling this endpoint when `configRegistryApiEnabled` is true.
 * Without a mock, every E2E test would otherwise make an unmocked request.
 *
 * Returns an empty chains array so no dynamic networks are injected during
 * tests. Selectors fall back to static PopularList when no featured networks
 * exist. Override in a test-specific mock to exercise the config-registry path.
 */
export const CONFIG_REGISTRY_API_MOCKS: MockEventsObject = {
  GET: [
    {
      urlEndpoint:
        /^https:\/\/client-config\.(dev-|uat-)?api\.cx\.metamask\.io\/v1\/config\/networks/,
      responseCode: 200,
      response: {
        data: {
          version: '0.0.0',
          timestamp: 0,
          chains: [],
        },
      },
    },
  ],
};
