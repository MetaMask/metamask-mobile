import { MockEventsObject } from '../../../framework';

/**
 * Default mocks for ConfigRegistryApiService. The controller polls both
 * endpoints when `configRegistryApiEnabled` is true. Without these mocks,
 * every E2E test fails live-request validation.
 *
 * Networks returns an empty chains array so no dynamic networks are injected.
 * Selectors fall back to static PopularList when no featured networks exist.
 * Events config returns an empty catalog so analytics purpose lookups stay
 * inert. Override in a test-specific mock to exercise either path.
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
    {
      urlEndpoint:
        /^https:\/\/client-config\.(dev-|uat-)?api\.cx\.metamask\.io\/v1\/config\/events-config/,
      responseCode: 200,
      response: {
        data: {
          schemaVersion: '1',
          version: '0.0.0',
          timestamp: 0,
          events: {},
        },
      },
    },
  ],
};
