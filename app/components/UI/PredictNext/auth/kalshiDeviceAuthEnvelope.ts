import type {
  KalshiDeviceSignature,
  KalshiSigningContext,
} from './kalshiRequestSigner';

export const KALSHI_DEVICE_AUTH_HEADER = 'Kalshi-Device-Auth';

/** predict-api rejects an envelope with more signatures than this. */
export const KALSHI_ENVELOPE_MAX_SIGNATURES = 4;

/** `Kalshi-Device-Auth` value: unpadded base64url of the JSON envelope. */
export const buildDeviceAuthHeader = (
  context: Pick<KalshiSigningContext, 'a2t' | 'deviceKey' | 'salt'>,
  signatures: readonly KalshiDeviceSignature[],
): string => {
  if (
    signatures.length === 0 ||
    signatures.length > KALSHI_ENVELOPE_MAX_SIGNATURES
  ) {
    throw new Error('Kalshi-Device-Auth needs 1 to 4 signatures');
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
