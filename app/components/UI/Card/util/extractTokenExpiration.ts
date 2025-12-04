/**
 * Default expiration time for onboarding access tokens in seconds.
 * Since the API doesn't provide expiration information and tokens are UUIDs (not JWTs),
 * we use a conservative estimate based on server-side configuration.
 *
 * The actual token expiration is 6 hours, but we use 5 hours (18000 seconds)
 * to provide a 1-hour buffer and avoid edge cases where the token might expire
 * during an API request.
 *
 * After this period, users will need to authenticate via the full login flow
 * which provides both access and refresh tokens.
 */
const DEFAULT_TOKEN_EXPIRATION_SECONDS = 18000; // 5 hours (6 hours actual - 1 hour buffer)

/**
 * Returns the expiration time for an onboarding access token.
 *
 * Since onboarding tokens are UUIDs without embedded expiration information,
 * and the API doesn't provide expiration metadata, this function returns
 * a reasonable default expiration time.
 *
 * @param _token - The access token (unused, kept for API consistency)
 * @returns Expiration time in seconds (default: 1800 seconds / 30 minutes)
 */
export const extractTokenExpiration = (_token: string): number =>
  DEFAULT_TOKEN_EXPIRATION_SECONDS;
