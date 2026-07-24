import { getRampCallbackBaseUrl } from './getRampCallbackBaseUrl';

const PRODUCTION_CALLBACK =
  'https://on-ramp-content.api.cx.metamask.io/regions/fake-callback';
const STAGING_CALLBACK =
  'https://on-ramp-content.uat-api.cx.metamask.io/regions/fake-callback';
const DEVELOPMENT_CALLBACK =
  'https://on-ramp.dev-api.cx.metamask.io/regions/fake-callback';

describe('getRampCallbackBaseUrl', () => {
  const originalEnv = process.env.METAMASK_ENVIRONMENT;

  afterEach(() => {
    process.env.METAMASK_ENVIRONMENT = originalEnv;
  });

  it('returns production content callback for production', () => {
    process.env.METAMASK_ENVIRONMENT = 'production';
    expect(getRampCallbackBaseUrl()).toBe(PRODUCTION_CALLBACK);
  });

  it('returns production content callback for beta', () => {
    process.env.METAMASK_ENVIRONMENT = 'beta';
    expect(getRampCallbackBaseUrl()).toBe(PRODUCTION_CALLBACK);
  });

  it('returns production content callback for rc', () => {
    process.env.METAMASK_ENVIRONMENT = 'rc';
    expect(getRampCallbackBaseUrl()).toBe(PRODUCTION_CALLBACK);
  });

  it('returns Dev API fake-callback for dev (no content.dev-api host)', () => {
    process.env.METAMASK_ENVIRONMENT = 'dev';
    expect(getRampCallbackBaseUrl()).toBe(DEVELOPMENT_CALLBACK);
  });

  it('returns staging content callback for exp', () => {
    process.env.METAMASK_ENVIRONMENT = 'exp';
    expect(getRampCallbackBaseUrl()).toBe(STAGING_CALLBACK);
  });

  it('returns staging content callback for test', () => {
    process.env.METAMASK_ENVIRONMENT = 'test';
    expect(getRampCallbackBaseUrl()).toBe(STAGING_CALLBACK);
  });

  it('returns staging content callback for e2e', () => {
    process.env.METAMASK_ENVIRONMENT = 'e2e';
    expect(getRampCallbackBaseUrl()).toBe(STAGING_CALLBACK);
  });

  it('returns staging content callback when METAMASK_ENVIRONMENT is unset', () => {
    delete process.env.METAMASK_ENVIRONMENT;
    expect(getRampCallbackBaseUrl()).toBe(STAGING_CALLBACK);
  });
});
