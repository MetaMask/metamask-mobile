import type {
  DeviceSignature,
  DeviceSigningContext,
} from './deviceRequestSigner';

/** Version of the trading `Venue-Authorization` envelope (ADR-0004). */
export const VENUE_AUTHORIZATION_VERSION = 1;

/**
 * `Venue-Authorization` header value: unpadded base64url of the JSON
 * envelope `{ v, profile, credential, signatures }`. Exactly one signature
 * per call. Onboarding (a separate, temporary demo flow) uses its own
 * envelope version 2 on the same header name; the two never mix.
 */
export const buildVenueAuthorization = (input: {
  /** The verified profile document this signature was rendered from. */
  profile: { id: string; version: number };
  context: DeviceSigningContext;
  signatures: readonly DeviceSignature[];
  maxSignatures: number;
}): string => {
  if (input.signatures.length > input.maxSignatures) {
    throw new Error(
      `Venue authorization needs at most ${input.maxSignatures} signatures`,
    );
  }
  const json = JSON.stringify({
    v: VENUE_AUTHORIZATION_VERSION,
    profile: input.profile,
    credential: {
      a2t: input.context.a2t,
      deviceKey: input.context.deviceKey,
      salt: input.context.salt,
    },
    signatures: input.signatures,
  });
  return Buffer.from(json, 'utf8')
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
};
