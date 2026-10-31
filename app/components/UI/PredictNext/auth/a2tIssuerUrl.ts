/**
 * Normalizes an A2T issuer base URL.
 *
 * The issuer is https only. A missing value returns undefined so issuance
 * can skip. A trailing slash is removed so request paths concatenate cleanly.
 */
export const resolveA2tIssuerUrl = (
  configured: string | undefined,
): string | undefined => {
  const raw = configured?.trim();
  if (!raw) {
    return undefined;
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('MM_A2T_URL is not a URL');
  }

  if (url.protocol !== 'https:') {
    throw new Error('MM_A2T_URL must be https');
  }

  return url.toString().replace(/\/$/u, '');
};
