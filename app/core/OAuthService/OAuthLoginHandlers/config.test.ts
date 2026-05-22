import { OAUTH_CONFIG } from './config';

describe('OAuth handler config', () => {
  it('keeps auth-service config local and profile-sync values out of OAuth config', () => {
    Object.values(OAUTH_CONFIG).forEach((config) => {
      const rawConfig = config as unknown as Record<string, unknown>;

      expect(config.AUTH_SERVER_URL).toMatch(/^https:\/\/auth-service\./u);
      expect(config.WEB3AUTH_NETWORK).toBeTruthy();
      expect(rawConfig.AUTHENTICATION_SERVER_URL).toBeUndefined();
      expect(rawConfig.HYDRA_TOKEN_URL).toBeUndefined();
      expect(rawConfig.HYDRA_CLIENT_ID).toBeUndefined();
    });
  });

  it('defines Telegram connection ids for every build type', () => {
    Object.values(OAUTH_CONFIG).forEach((config) => {
      expect(config.TELEGRAM_GROUPED_AUTH_CONNECTION_ID).toBeTruthy();
      expect(config.ANDROID_TELEGRAM_AUTH_CONNECTION_ID).toBeTruthy();
      expect(config.IOS_TELEGRAM_AUTH_CONNECTION_ID).toBeTruthy();
      expect(config.TELEGRAM_CLIENT_ID).toBeTruthy();
    });
  });
});
