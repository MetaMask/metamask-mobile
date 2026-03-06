import { MockApiEndpoint, RampsRegion } from '../../../../framework';

/**
 * Creates a region-specific geolocation response based on the selected region
 *
 * Note: Production endpoint is mocked here because e2e tests may use production builds
 * (app-prod-debug.apk). When METAMASK_ENVIRONMENT=production, the app calls the
 * production geolocation endpoint instead of dev/uat endpoints.
 */
export const createGeolocationResponse = (
  region: RampsRegion,
): MockApiEndpoint[] => {
  // Map environment prefixes to their URL patterns
  const envConfigs = [
    { env: 'uat', url: 'https://on-ramp.uat-api.cx.metamask.io/geolocation' },
    { env: 'dev', url: 'https://on-ramp.dev-api.cx.metamask.io/geolocation' },
    { env: 'prod', url: 'https://on-ramp.api.cx.metamask.io/geolocation' },
  ];

  // The real /geolocation endpoint returns an ISO 3166-2 location code
  // (e.g. 'US-NY', 'FR'). The GeolocationApiService validates the response
  // against /^[A-Z]{2}(-[A-Z0-9]{1,3})?$/ and rejects anything else as UNKNOWN.
  return envConfigs.map(({ url }) => ({
    urlEndpoint: url,
    responseCode: 200,
    response: region.countryIsoCode,
  }));
};
