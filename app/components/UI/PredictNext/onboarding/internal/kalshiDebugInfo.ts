export interface A2tSummary {
  sub?: string;
  aud?: string;
  iss?: string;
  expiresAt?: string;
}

/** Claims only. The token itself is never shown or logged. */
export const summarizeA2t = (token: string | undefined): A2tSummary => {
  const payload = token?.split('.')[1];
  if (!payload) {
    return {};
  }
  try {
    const base64 = payload.replaceAll('-', '+').replaceAll('_', '/');
    const claims = JSON.parse(
      // eslint-disable-next-line no-restricted-globals
      Buffer.from(base64, 'base64').toString('utf8'),
    ) as Record<string, unknown>;
    return {
      sub: typeof claims.sub === 'string' ? claims.sub : undefined,
      aud: typeof claims.aud === 'string' ? claims.aud : undefined,
      iss: typeof claims.iss === 'string' ? claims.iss : undefined,
      expiresAt:
        typeof claims.exp === 'number'
          ? new Date(claims.exp * 1000).toISOString()
          : undefined,
    };
  } catch {
    return {};
  }
};
