import { Env } from '@metamask/shield-controller';
import { captureException } from '@sentry/react-native';
import { getShieldApiServiceInstanceOptions } from './shield-api-service';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

describe('getShieldApiServiceInstanceOptions', () => {
  const originalEnv = process.env.API_ENV;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.API_ENV;
    } else {
      process.env.API_ENV = originalEnv;
    }
  });

  it('builds options with fetch, production env, and Sentry capture by default', () => {
    delete process.env.API_ENV;

    const options = getShieldApiServiceInstanceOptions();

    expect(options).toEqual({
      fetchFunction: fetch,
      env: Env.PRD,
      captureException,
    });
  });

  it('maps API_ENV=dev to Env.DEV', () => {
    process.env.API_ENV = 'dev';

    const options = getShieldApiServiceInstanceOptions();

    expect(options.env).toBe(Env.DEV);
  });

  it('maps API_ENV=uat to Env.UAT', () => {
    process.env.API_ENV = 'uat';

    const options = getShieldApiServiceInstanceOptions();

    expect(options.env).toBe(Env.UAT);
  });
});
