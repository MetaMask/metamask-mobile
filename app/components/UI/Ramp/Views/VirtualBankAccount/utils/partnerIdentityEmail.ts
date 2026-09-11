interface PartnerIdentityJwtPayload {
  email?: unknown;
  ext?: unknown;
}

const firstEmailString = (...candidates: unknown[]): string | undefined => {
  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }
  return undefined;
};

const emailFromExt = (ext: unknown): unknown => {
  if (typeof ext === 'string') {
    return ext;
  }
  if (ext && typeof ext === 'object' && 'email' in ext) {
    return ext.email;
  }
  return undefined;
};

/**
 * Reads the email claim from a partner identity JWT.
 * Live tokens put email under `ext` (Hydra extra claims).
 *
 * @param token - Compact JWT returned by `getPartnerIdentityToken`.
 * @returns Trimmed email, or `undefined` when the claim is missing or malformed.
 */
export const emailFromPartnerIdentityToken = (
  token: string,
): string | undefined => {
  try {
    const payloadSegment = token.split('.')[1];
    if (!payloadSegment) {
      return undefined;
    }
    const normalized = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(
      Buffer.from(normalized, 'base64').toString('utf8'),
    ) as PartnerIdentityJwtPayload;
    return firstEmailString(emailFromExt(payload.ext), payload.email);
  } catch {
    return undefined;
  }
};
