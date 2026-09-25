import { getDefaultRedirectCallbackUrl } from '@metamask/ramps-controller';

import { getRampsEnvironment } from '../../../../core/Engine/controllers/ramps-controller/ramps-service-init';
import { getRampCallbackBaseUrl } from './getRampCallbackBaseUrl';

const PRODUCTION_CALLBACK =
  'https://on-ramp-content.api.cx.metamask.io/regions/fake-callback';
const STAGING_CALLBACK =
  'https://on-ramp-content.uat-api.cx.metamask.io/regions/fake-callback';
const DEVELOPMENT_CALLBACK =
  'https://on-ramp.dev-api.cx.metamask.io/regions/fake-callback';

describe('getRampCallbackBaseUrl', () => {
  const originalMetamaskEnvironment = process.env.METAMASK_ENVIRONMENT;
  const originalApiEnv = process.env.MM_API_ENV;

  afterEach(() => {
    process.env.METAMASK_ENVIRONMENT = originalMetamaskEnvironment;
    if (originalApiEnv !== undefined) {
      process.env.MM_API_ENV = originalApiEnv;
    } else {
      delete process.env.MM_API_ENV;
    }
  });

  beforeEach(() => {
    delete process.env.MM_API_ENV;
  });

  it.each([
    ['production', PRODUCTION_CALLBACK],
    ['beta', PRODUCTION_CALLBACK],
    ['rc', PRODUCTION_CALLBACK],
    ['dev', DEVELOPMENT_CALLBACK],
    ['exp', STAGING_CALLBACK],
    ['test', PRODUCTION_CALLBACK],
    ['e2e', PRODUCTION_CALLBACK],
  ] as const)(
    'matches getDefaultRedirectCallbackUrl(getRampsEnvironment()) for METAMASK_ENVIRONMENT=%s',
    (metamaskEnvironment, expected) => {
      process.env.METAMASK_ENVIRONMENT = metamaskEnvironment;
      expect(getRampCallbackBaseUrl()).toBe(expected);
      expect(getRampCallbackBaseUrl()).toBe(
        getDefaultRedirectCallbackUrl(getRampsEnvironment()),
      );
    },
  );

  it('returns the production callback when METAMASK_ENVIRONMENT is unset', () => {
    delete process.env.METAMASK_ENVIRONMENT;
    expect(getRampCallbackBaseUrl()).toBe(PRODUCTION_CALLBACK);
    expect(getRampCallbackBaseUrl()).toBe(
      getDefaultRedirectCallbackUrl(getRampsEnvironment()),
    );
  });

  it('prefers MM_API_ENV over METAMASK_ENVIRONMENT', () => {
    process.env.METAMASK_ENVIRONMENT = 'dev';
    process.env.MM_API_ENV = 'prod';
    expect(getRampCallbackBaseUrl()).toBe(PRODUCTION_CALLBACK);
    expect(getRampCallbackBaseUrl()).toBe(
      getDefaultRedirectCallbackUrl(getRampsEnvironment()),
    );
  });
});
