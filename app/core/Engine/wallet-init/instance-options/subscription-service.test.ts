import { captureException } from '@sentry/react-native';
import { getSubscriptionServiceInstanceOptions } from './subscription-service';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

describe('getSubscriptionServiceInstanceOptions', () => {
  const originalEnv = process.env.MM_API_ENV;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.MM_API_ENV;
    } else {
      process.env.MM_API_ENV = originalEnv;
    }
  });

  it('builds options with fetch, production base URL, and Sentry capture by default', () => {
    delete process.env.MM_API_ENV;

    const options = getSubscriptionServiceInstanceOptions();

    expect(options).toEqual({
      fetchFunction: fetch,
      baseUrl: 'https://subscription.api.cx.metamask.io',
      captureException,
    });
  });

  it('uses the dev base URL when MM_API_ENV=dev', () => {
    process.env.MM_API_ENV = 'dev';

    const options = getSubscriptionServiceInstanceOptions();

    expect(options.baseUrl).toBe('https://subscription.dev-api.cx.metamask.io');
  });

  it('uses the uat base URL when MM_API_ENV=uat', () => {
    process.env.MM_API_ENV = 'uat';

    const options = getSubscriptionServiceInstanceOptions();

    expect(options.baseUrl).toBe('https://subscription.uat-api.cx.metamask.io');
  });
});
