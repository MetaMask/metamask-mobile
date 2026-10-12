import { create, get } from 'react-native-passkeys';
import { MfaFlowError } from './engine/errors';
import type { MfaFlowErrorCode, PasskeyAdapter } from './engine/types';

/**
 * Whether the user dismissed the passkey sheet: iOS reports it with the code
 * `ERR_USER_CANCELLED`, Android with the message `UserCancelled`.
 *
 * @param error - The error the passkey library rejected with.
 * @returns `true` for a dismissed sheet.
 */
const isCancellation = (error: unknown): boolean => {
  const { code, message } = (error ?? {}) as {
    code?: unknown;
    message?: unknown;
  };
  return code === 'ERR_USER_CANCELLED' || message === 'UserCancelled';
};

/**
 * Runs one passkey ceremony, turning its failures into MFA errors the flow
 * knows: a dismissed sheet can be retried in place, anything else shows
 * "Couldn't use your passkey".
 *
 * @param ceremony - The library call.
 * @param failure - The code for a failed ceremony.
 * @returns The ceremony's response.
 */
const runCeremony = async <Response>(
  ceremony: () => Promise<Response | null>,
  failure: MfaFlowErrorCode,
): Promise<Response> => {
  let response: Response | null;
  try {
    response = await ceremony();
  } catch (error) {
    throw new MfaFlowError(
      isCancellation(error) ? 'passkey_ceremony_cancelled' : failure,
    );
  }
  if (!response) {
    throw new MfaFlowError(failure);
  }
  return response;
};

// The SDK types enum-like fields (`attestation`, `userVerification`, ...) as
// the plain strings the server sends; the library narrows them to the WebAuthn
// unions. The values are the same.
type CreateRequest = Parameters<typeof create>[0];
type GetRequest = Parameters<typeof get>[0];

/**
 * The platform passkey sheet, through `react-native-passkeys`.
 */
export const mobilePasskeyAdapter: PasskeyAdapter = {
  create: (options) =>
    runCeremony(() => create(options as CreateRequest), 'invalid_attestation'),
  get: (options) =>
    runCeremony(() => get(options as GetRequest), 'invalid_assertion'),
};
