import type {
  DeviceSignature,
  DeviceSigningContext,
} from './deviceRequestSigner';

/** Version of the `Venue-Authorization` envelope. */
export const VENUE_AUTHORIZATION_VERSION = 2;

/**
 * `Venue-Authorization` header value: unpadded base64url of the JSON
 * envelope `{ v, signingProfileId, step, credential, signatures }`. The
 * signatures are listed in the order the step's requests were rendered, and
 * predict-api pairs them with the requests it renders itself.
 */
export const buildVenueAuthorization = (input: {
  signingProfileId: string;
  step: string;
  context: DeviceSigningContext;
  signatures: readonly DeviceSignature[];
  maxSignatures: number;
}): string => {
  if (
    input.signatures.length === 0 ||
    input.signatures.length > input.maxSignatures
  ) {
    throw new Error(
      `Venue authorization needs 1 to ${input.maxSignatures} signatures`,
    );
  }
  const json = JSON.stringify({
    v: VENUE_AUTHORIZATION_VERSION,
    signingProfileId: input.signingProfileId,
    step: input.step,
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
