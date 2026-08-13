import { MockEventsObject } from '../../../framework';

/**
 * Default mock for the geolocation-api `/v2/geolocation` endpoint used by
 * `@metamask/geolocation-controller` (v1+). The `GeolocationController`
 * resolves the user's location at startup via `GeolocationApiService`, so every
 * E2E test would otherwise make an unmocked request to this host.
 *
 * Covers the dev, uat, and prod hosts (geolocation.{dev-|uat-|}api.cx.metamask.io).
 *
 * Can be overridden by a test-specific mock when a particular region is needed.
 */
export const GEOLOCATION_API_MOCKS: MockEventsObject = {
  GET: [
    {
      urlEndpoint:
        /^https:\/\/geolocation\.(dev-|uat-)?api\.cx\.metamask\.io\/v2\/geolocation/,
      responseCode: 200,
      response: {
        country: 'US',
        region: 'CA',
        timezone: 'America/Los_Angeles',
      },
    },
  ],
};
