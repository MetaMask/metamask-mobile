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
  const originalRampsEnvironment = process.env.RAMPS_ENVIRONMENT;

  afterEach(() => {
    process.env.METAMASK_ENVIRONMENT = originalMetamaskEnvironment;
    if (originalRampsEnvironment !== undefined) {
      process.env.RAMPS_ENVIRONMENT = originalRampsEnvironment;
    } else {
      delete process.env.RAMPS_ENVIRONMENT;
    }
  });

  beforeEach(() => {
    delete process.env.RAMPS_ENVIRONMENT;
  });

  it.each([
    ['production', PRODUCTION_CALLBACK],
    ['beta', PRODUCTION_CALLBACK],
    ['rc', PRODUCTION_CALLBACK],
    ['dev', DEVELOPMENT_CALLBACK],
    ['exp', STAGING_CALLBACK],
    ['test', STAGING_CALLBACK],
    ['e2e', STAGING_CALLBACK],
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

  it('returns staging content callback when METAMASK_ENVIRONMENT is unset', () => {
    delete process.env.METAMASK_ENVIRONMENT;
    expect(getRampCallbackBaseUrl()).toBe(STAGING_CALLBACK);
    expect(getRampCallbackBaseUrl()).toBe(
      getDefaultRedirectCallbackUrl(getRampsEnvironment()),
    );
  });

  it('prefers RAMPS_ENVIRONMENT over METAMASK_ENVIRONMENT', () => {
    process.env.METAMASK_ENVIRONMENT = 'e2e';
    process.env.RAMPS_ENVIRONMENT = 'production';
    expect(getRampCallbackBaseUrl()).toBe(PRODUCTION_CALLBACK);
    expect(getRampCallbackBaseUrl()).toBe(
      getDefaultRedirectCallbackUrl(getRampsEnvironment()),
    );
  });
});
