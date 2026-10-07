import { socialApiUrl } from './apiEnv';

describe('socialApiUrl', () => {
  const originalApiEnv = process.env.MM_API_ENV;
  const originalSocialUrl = process.env.SOCIAL_API_URL;

  afterEach(() => {
    if (originalApiEnv !== undefined) {
      process.env.MM_API_ENV = originalApiEnv;
    } else {
      delete process.env.MM_API_ENV;
    }
    if (originalSocialUrl !== undefined) {
      process.env.SOCIAL_API_URL = originalSocialUrl;
    } else {
      delete process.env.SOCIAL_API_URL;
    }
  });

  it('uses the production host when the cluster is prod and no override is set', () => {
    process.env.MM_API_ENV = 'prod';
    delete process.env.SOCIAL_API_URL;

    expect(socialApiUrl()).toBe('https://social.api.cx.metamask.io');
  });

  it('uses the dev host when the cluster is dev and no override is set', () => {
    process.env.MM_API_ENV = 'dev';
    delete process.env.SOCIAL_API_URL;

    expect(socialApiUrl()).toBe('https://social.dev-api.cx.metamask.io');
  });

  it('uses the dev host when the cluster is uat and no override is set', () => {
    process.env.MM_API_ENV = 'uat';
    delete process.env.SOCIAL_API_URL;

    expect(socialApiUrl()).toBe('https://social.dev-api.cx.metamask.io');
  });

  it('uses the production host when the cluster is unset', () => {
    process.env.MM_API_ENV = '';
    process.env.SOCIAL_API_URL = '';

    expect(socialApiUrl()).toBe('https://social.api.cx.metamask.io');
  });

  it('uses SOCIAL_API_URL when it is set', () => {
    process.env.MM_API_ENV = 'dev';
    process.env.SOCIAL_API_URL = 'https://social.example';

    expect(socialApiUrl()).toBe('https://social.example');
  });
});
