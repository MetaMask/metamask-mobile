import {
  resolvePredictApiUrl,
  resolvePredictDeviceAuthIssuerUrl,
} from './predictClusterUrls';

const DEV_API_URL = 'https://predict-api.dev-api.cx.metamask.io';
const UAT_API_URL = 'https://predict-api.uat-api.cx.metamask.io';
const DEV_ISSUER_URL = 'https://authentication.dev-api.cx.metamask.io';
const UAT_ISSUER_URL = 'https://authentication.uat-api.cx.metamask.io';

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
    expect(resolveUrl('dev', undefined, false)).toBe(devUrl);
    expect(resolveUrl('DEV', undefined, true)).toBe(devUrl);
  });

  it('uses the dev host for a local development build with no cluster', () => {
    expect(resolveUrl(undefined, undefined, true)).toBe(devUrl);
    expect(resolveUrl('  ', undefined, true)).toBe(devUrl);
  });

  it('uses the uat host for the uat cluster', () => {
    expect(resolveUrl('uat', undefined, false)).toBe(uatUrl);
  });

  it('stays blank for prod', () => {
    expect(resolveUrl('prod', undefined, false)).toBeUndefined();
    expect(resolveUrl('prod', undefined, true)).toBeUndefined();
    expect(resolveUrl('prod', '  ', false)).toBeUndefined();
  });

  it('stays blank in a release build when the cluster is unset', () => {
    expect(resolveUrl(undefined, undefined, false)).toBeUndefined();
    expect(resolveUrl(undefined, '  ', false)).toBeUndefined();
  });

  it('uses an explicit URL in every cluster', () => {
    expect(resolveUrl('dev', 'https://predict.example', true)).toBe(
      'https://predict.example',
    );
    expect(resolveUrl('uat', 'https://predict.example', false)).toBe(
      'https://predict.example',
    );
    expect(resolveUrl('prod', 'https://predict.example', false)).toBe(
      'https://predict.example',
    );
  });
});
