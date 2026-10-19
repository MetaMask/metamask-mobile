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
  const originalApiEnv = process.env.MM_API_ENV;

  afterEach(() => {
    if (originalApiEnv !== undefined) {
      process.env.MM_API_ENV = originalApiEnv;
    } else {
      delete process.env.MM_API_ENV;
    }
  });

  it.each([
    ['dev', DEVELOPMENT_CALLBACK],
    ['uat', STAGING_CALLBACK],
    ['prod', PRODUCTION_CALLBACK],
  ] as const)(
    'matches getDefaultRedirectCallbackUrl(getRampsEnvironment()) for MM_API_ENV=%s',
    (apiEnv, expected) => {
      process.env.MM_API_ENV = apiEnv;

      expect(getRampCallbackBaseUrl()).toBe(expected);
      expect(getRampCallbackBaseUrl()).toBe(
        getDefaultRedirectCallbackUrl(getRampsEnvironment()),
      );
    },
  );

  it('returns the production callback when MM_API_ENV is unset', () => {
    delete process.env.MM_API_ENV;

    expect(getRampCallbackBaseUrl()).toBe(PRODUCTION_CALLBACK);
    expect(getRampCallbackBaseUrl()).toBe(
      getDefaultRedirectCallbackUrl(getRampsEnvironment()),
    );
  });
});
