import type {
  DeviceSignature,
  DeviceSigningContext,
} from './deviceRequestSigner';

/** predict-api rejects an envelope with more signatures than this. */
export const DEVICE_AUTH_ENVELOPE_MAX_SIGNATURES = 4;

/** Device-auth header value: unpadded base64url of the JSON envelope. */
export const buildDeviceAuthEnvelope = (
  context: DeviceSigningContext,
  signatures: readonly DeviceSignature[],
): string => {
  if (
    signatures.length === 0 ||
    signatures.length > DEVICE_AUTH_ENVELOPE_MAX_SIGNATURES
  ) {
    throw new Error('Device-auth envelope needs 1 to 4 signatures');
  }
  const json = JSON.stringify({
    v: 1,
    a2t: context.a2t,
    deviceKey: context.deviceKey,
    salt: context.salt,
    signatures,
  });
  return Buffer.from(json, 'utf8')
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
};
