import { Env } from '@metamask/claims-controller';
import { captureException } from '@sentry/react-native';
import { getClaimsServiceInstanceOptions } from './claims-service';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

describe('getClaimsServiceInstanceOptions', () => {
  const originalEnv = process.env.MM_DEV_API_ENV;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.MM_DEV_API_ENV;
    } else {
      process.env.MM_DEV_API_ENV = originalEnv;
    }
  });

  it('builds options with fetch, production env, and Sentry capture by default', () => {
    delete process.env.MM_DEV_API_ENV;

    const options = getClaimsServiceInstanceOptions();

    expect(options).toEqual({
      fetchFunction: fetch,
      env: Env.PRD,
      captureException,
    });
  });

  it('maps MM_DEV_API_ENV=dev to Env.DEV', () => {
    process.env.MM_DEV_API_ENV = 'dev';

    const options = getClaimsServiceInstanceOptions();

    expect(options.env).toBe(Env.DEV);
  });
});
