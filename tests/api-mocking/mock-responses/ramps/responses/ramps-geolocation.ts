import {
  getRegionLocationCode,
  MockApiEndpoint,
  RampsRegion,
} from '../../../../framework';

/**
 * The legacy on-ramp `/geolocation` endpoint (plain-text ISO code).
 */
const ONRAMP_GEOLOCATION_URLS = [
  'https://on-ramp.uat-api.cx.metamask.io/geolocation',
  'https://on-ramp.dev-api.cx.metamask.io/geolocation',
  'https://on-ramp.api.cx.metamask.io/geolocation',
];

/**
 * The `/v2/geolocation` endpoint that `@metamask/geolocation-controller` v1+
 * calls (JSON). Every core `GeolocationController` consumer (Perps, Rewards,
 * Ramps, analytics, ...) now reads from here, so region overrides must target
 * this endpoint or they fall through to the default (US) mock.
 */
const V2_GEOLOCATION_URLS = [
  'https://geolocation.uat-api.cx.metamask.io/v2/geolocation',
  'https://geolocation.dev-api.cx.metamask.io/v2/geolocation',
  'https://geolocation.api.cx.metamask.io/v2/geolocation',
];

/**
 * Builds the JSON body the `/v2/geolocation` endpoint returns for a region.
 * `GeolocationController` derives its ISO location code from `country` +
 * `region` (e.g. `{ country: 'US', region: 'CA' }` -> `US-CA`).
 */
export const buildV2GeolocationResponse = (
  region: RampsRegion,
): { country: string; region: string | null; timezone: string | null } => {
  const [country, subdivision] = getRegionLocationCode(region).split('-');
  return { country, region: subdivision ?? null, timezone: null };
};

/**
 * Creates a region-specific geolocation response based on the selected region.
 *
 * Mocks both the current `/v2/geolocation` endpoint (JSON, used by the core
 * `GeolocationController`) and the legacy on-ramp `/geolocation` endpoint
 * (plain-text ISO code, kept defensively) so region overrides take effect
 * regardless of which endpoint a flow hits.
 *
 * Note: Production endpoint is mocked here because e2e tests may use production builds
 * (app-prod-debug.apk). When METAMASK_ENVIRONMENT=production, the app calls the
 * production geolocation endpoint instead of dev/uat endpoints.
 */
export const createGeolocationResponse = (
  region: RampsRegion,
): MockApiEndpoint[] => {
  // The real /geolocation endpoint returns an ISO 3166-2 location code
  // (e.g. 'US-CA', 'FR'). The GeolocationApiService validates the response
  // against /^[A-Z]{2}(-[A-Z0-9]{1,3})?$/ and rejects anything else as UNKNOWN.
  const locationCode = getRegionLocationCode(region);
  const v2Response = buildV2GeolocationResponse(region);

  return [
    ...V2_GEOLOCATION_URLS.map((url) => ({
      urlEndpoint: url,
      responseCode: 200,
      response: v2Response,
    })),
    ...ONRAMP_GEOLOCATION_URLS.map((url) => ({
      urlEndpoint: url,
      responseCode: 200,
      response: locationCode,
    })),
  ];
};
