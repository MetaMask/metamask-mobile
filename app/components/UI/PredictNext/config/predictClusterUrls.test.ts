import { ApiEnv } from '../../../../core/apiEnv';
import {
  resolvePredictApiUrl,
  resolvePredictDeviceAuthIssuerUrl,
  type ClusterReading,
} from './predictClusterUrls';
import {
  resolveVenueProfileRegistryUrl,
  VENUE_PROFILE_REGISTRY_URL,
} from '../auth/venueProfileRegistryUrl';

const DEV_API_URL = 'https://predict-api.dev-api.cx.metamask.io';
const UAT_API_URL = 'https://predict-api.uat-api.cx.metamask.io';
const DEV_ISSUER_URL = 'https://authentication.dev-api.cx.metamask.io';
const UAT_ISSUER_URL = 'https://authentication.uat-api.cx.metamask.io';

const reading = (apiEnv: ApiEnv, isDevelopment = false): ClusterReading => ({
  rawApiEnv: apiEnv,
  apiEnv,
  isDevelopment,
});

const unsetReading = (isDevelopment = false): ClusterReading => ({
  rawApiEnv: undefined,
  apiEnv: ApiEnv.Prod,
  isDevelopment,
});

describe.each([
  ['predict API', resolvePredictApiUrl, DEV_API_URL, UAT_API_URL],
  [
    'A2T issuer',
    resolvePredictDeviceAuthIssuerUrl,
    DEV_ISSUER_URL,
    UAT_ISSUER_URL,
  ],
] as const)('%s', (_label, resolveUrl, devUrl, uatUrl) => {
  it('uses the dev host for the dev cluster', () => {
    expect(resolveUrl(reading(ApiEnv.Dev), undefined)).toBe(devUrl);
    expect(resolveUrl(reading(ApiEnv.Dev, true), undefined)).toBe(devUrl);
  });

  it('uses the dev host for a local development build with no cluster', () => {
    expect(resolveUrl(unsetReading(true), undefined)).toBe(devUrl);
    expect(
      resolveUrl({ ...unsetReading(true), rawApiEnv: '  ' }, undefined),
    ).toBe(devUrl);
  });

  it('uses the uat host for the uat cluster', () => {
    expect(resolveUrl(reading(ApiEnv.Uat), undefined)).toBe(uatUrl);
  });

  it('stays blank for prod', () => {
    expect(resolveUrl(reading(ApiEnv.Prod), undefined)).toBeUndefined();
    expect(resolveUrl(reading(ApiEnv.Prod, true), undefined)).toBeUndefined();
    expect(resolveUrl(reading(ApiEnv.Prod), '  ')).toBeUndefined();
  });

  it('stays blank in a release build when the cluster is unset', () => {
    expect(resolveUrl(unsetReading(false), undefined)).toBeUndefined();
    expect(resolveUrl(unsetReading(false), '  ')).toBeUndefined();
  });

  it('stays blank for a value that names no cluster, even in a dev build', () => {
    // `getApiEnv` reads an unrecognized value as prod, so the reading carries
    // prod. A predict host here would point the client at an environment the
    // A2T issuer does not match.
    const unrecognized = { rawApiEnv: 'staging', apiEnv: ApiEnv.Prod };
    expect(
      resolveUrl({ ...unrecognized, isDevelopment: true }, undefined),
    ).toBeUndefined();
    expect(
      resolveUrl({ ...unrecognized, isDevelopment: false }, undefined),
    ).toBeUndefined();
  });

  it('uses an explicit URL in every cluster', () => {
    expect(
      resolveUrl(reading(ApiEnv.Dev, true), 'https://predict.example'),
    ).toBe('https://predict.example');
    expect(resolveUrl(reading(ApiEnv.Uat), 'https://predict.example')).toBe(
      'https://predict.example',
    );
    expect(resolveUrl(reading(ApiEnv.Prod), 'https://predict.example')).toBe(
      'https://predict.example',
    );
  });
});

describe('venue profile registry', () => {
  it('uses the same fixed registry URL for dev and uat', () => {
    expect(VENUE_PROFILE_REGISTRY_URL).toBe(
      'https://client-config.api.cx.metamask.io/v1/config/predict/venue-profiles',
    );
    expect(resolveVenueProfileRegistryUrl(reading(ApiEnv.Dev))).toBe(
      VENUE_PROFILE_REGISTRY_URL,
    );
    expect(resolveVenueProfileRegistryUrl(reading(ApiEnv.Uat))).toBe(
      VENUE_PROFILE_REGISTRY_URL,
    );
  });

  it('allows the local development default cluster', () => {
    expect(resolveVenueProfileRegistryUrl(unsetReading(true))).toBe(
      VENUE_PROFILE_REGISTRY_URL,
    );
  });

  it('disables remote registry reads without a supported cluster', () => {
    expect(
      resolveVenueProfileRegistryUrl(reading(ApiEnv.Prod)),
    ).toBeUndefined();
    expect(
      resolveVenueProfileRegistryUrl(reading(ApiEnv.Prod, true)),
    ).toBeUndefined();
    expect(resolveVenueProfileRegistryUrl(unsetReading(false))).toBeUndefined();
    expect(
      resolveVenueProfileRegistryUrl({
        rawApiEnv: 'staging',
        apiEnv: ApiEnv.Prod,
        isDevelopment: true,
      }),
    ).toBeUndefined();
  });

  it('uses a configured override in every cluster', () => {
    const override = 'http://127.0.0.1:8787/predict/venue-profiles';
    expect(resolveVenueProfileRegistryUrl(reading(ApiEnv.Prod), override)).toBe(
      override,
    );
    expect(
      resolveVenueProfileRegistryUrl(reading(ApiEnv.Dev), ` ${override} `),
    ).toBe(override);
  });

  it('ignores a blank override', () => {
    expect(resolveVenueProfileRegistryUrl(reading(ApiEnv.Dev), '   ')).toBe(
      VENUE_PROFILE_REGISTRY_URL,
    );
  });
});
