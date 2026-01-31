/**
 * Checks if the token has rwaData property
 */
export const hasRwaData = (token: unknown): token is { rwaData: unknown } =>
  typeof token === 'object' &&
  token !== null &&
  'rwaData' in token &&
  token.rwaData !== undefined;
