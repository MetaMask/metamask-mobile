export const X_AUTHORIZATION_ENDPOINT = 'https://x.com/i/oauth2/authorize';
export const X_TOKEN_ENDPOINT = 'https://api.x.com/2/oauth2/token';
export const X_REDIRECT_URI = 'https://link.metamask.io/x-oauth-redirect';
export const X_OAUTH_SCOPES = ['users.read', 'offline.access'];

/**
 * Reads the X OAuth client_id from the build-time env var. X registers a
 * single "Native App" client regardless of MetaMask's internal build type
 * (main/flask/dev/uat), so — unlike Google/Apple/Telegram in
 * app/core/OAuthService/OAuthLoginHandlers/config.ts — no per-build-type
 * config map is needed here.
 */
export function getXClientId(): string {
  const clientId = process.env.MM_X_OAUTH_CLIENT_ID;
  if (!clientId) {
    throw new Error('MM_X_OAUTH_CLIENT_ID is not set');
  }
  return clientId;
}
