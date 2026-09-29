/**
 * OAuth token pair obtained from X's token endpoint, normalized to
 * camelCase fields with expiresAt as an absolute epoch-ms timestamp.
 */
export interface XTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}
