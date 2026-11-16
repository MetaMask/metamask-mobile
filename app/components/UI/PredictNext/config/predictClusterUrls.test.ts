import {
  resolvePredictApiUrl,
  resolvePredictDeviceAuthIssuerUrl,
} from './predictClusterUrls';

const DEV_API_URL = 'https://predict-api.dev-api.cx.metamask.io';
const UAT_API_URL = 'https://predict-api.uat-api.cx.metamask.io';
const DEV_ISSUER_URL = 'https://authentication.dev-api.cx.metamask.io';
const UAT_ISSUER_URL = 'https://authentication.uat-api.cx.metamask.io';

const originalApiEnv = process.env.MM_API_ENV;

const setApiEnv = (value: string | undefined): void => {
  if (value === undefined) {
    delete process.env.MM_API_ENV;
  } else {
    process.env.MM_API_ENV = value;
  }
};

describe.each([
  ['predict API', resolvePredictApiUrl, DEV_API_URL, UAT_API_URL],
  [
    'A2T issuer',
    resolvePredictDeviceAuthIssuerUrl,
    DEV_ISSUER_URL,
    UAT_ISSUER_URL,
  ],
] as const)('%s', (_label, resolveUrl, devUrl, uatUrl) => {
  afterEach(() => {
    setApiEnv(originalApiEnv);
  });

  it('uses the dev host for the dev cluster', () => {
    setApiEnv('dev');
    expect(resolveUrl(undefined, false)).toBe(devUrl);
    expect(resolveUrl(undefined, true)).toBe(devUrl);
  });

  it('uses the dev host for a local development build with no cluster', () => {
    setApiEnv(undefined);
    expect(resolveUrl(undefined, true)).toBe(devUrl);
    setApiEnv('  ');
    expect(resolveUrl(undefined, true)).toBe(devUrl);
  });

  it('uses the uat host for the uat cluster', () => {
    setApiEnv('uat');
    expect(resolveUrl(undefined, false)).toBe(uatUrl);
  });

  it('stays blank for prod', () => {
    setApiEnv('prod');
    expect(resolveUrl(undefined, false)).toBeUndefined();
    expect(resolveUrl(undefined, true)).toBeUndefined();
    expect(resolveUrl('  ', false)).toBeUndefined();
  });

  it('stays blank in a release build when the cluster is unset', () => {
    setApiEnv(undefined);
    expect(resolveUrl(undefined, false)).toBeUndefined();
    expect(resolveUrl('  ', false)).toBeUndefined();
  });

  it('stays blank for a value that names no cluster, even in a dev build', () => {
    // Matches `getApiEnv`, which reads an unrecognized value as prod. A
    // predict host here would point the client at an environment the A2T
    // issuer does not match.
    setApiEnv('staging');
    expect(resolveUrl(undefined, true)).toBeUndefined();
    expect(resolveUrl(undefined, false)).toBeUndefined();
  });

  it('reads the cluster value exactly as getApiEnv does', () => {
    setApiEnv('DEV');
    expect(resolveUrl(undefined, false)).toBe(devUrl);
    setApiEnv('UAT');
    expect(resolveUrl(undefined, false)).toBe(uatUrl);
    // getApiEnv does not trim, so a padded value is not a cluster there and
    // must not be one here either.
    setApiEnv(' DEV ');
    expect(resolveUrl(undefined, false)).toBeUndefined();
  });

  it('uses an explicit URL in every cluster', () => {
    setApiEnv('dev');
    expect(resolveUrl('https://predict.example', true)).toBe(
      'https://predict.example',
    );
    setApiEnv('uat');
    expect(resolveUrl('https://predict.example', false)).toBe(
      'https://predict.example',
    );
    setApiEnv('prod');
    expect(resolveUrl('https://predict.example', false)).toBe(
      'https://predict.example',
    );
  });
});
