import { X_REDIRECT_URI } from './XAuthConfig';

describe('XAuthConfig', () => {
  it('uses the backend x-oauth-redirect universal link as the redirect URI', () => {
    expect(X_REDIRECT_URI).toBe('https://link.metamask.io/x-oauth-redirect');
  });
});
