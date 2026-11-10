import { create, get } from 'react-native-passkeys';
import Logger from '../../Logger';
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
 * Whether the password manager already holds a passkey for this account: the
 * request's `excludeCredentials` matched. iOS 18+ reports it with the code
 * `ERR_MATCHED_EXCLUDED_CREDENTIAL` (our patch of the library), Android with
 * the `InvalidStateError` DOM error.
 *
 * @param error - The error the passkey library rejected with.
 * @returns `true` when a passkey for this account is already there.
 */
const isExcludedCredential = (error: unknown): boolean => {
  const { code, message } = (error ?? {}) as {
    code?: unknown;
    message?: unknown;
  };
  return (
    code === 'ERR_MATCHED_EXCLUDED_CREDENTIAL' ||
    (typeof message === 'string' &&
      message.startsWith('DomError: InvalidStateError'))
  );
};

/**
 * Drops `null` fields: Expo returns the WebAuthn fields iOS does not provide
 * (`transports`, `publicKeyAlgorithm`, ...) as `null`, while the SDK expects
 * them absent.
 *
 * @param response - The library's response.
 * @returns The same response without `null` fields.
 */
const withoutNulls = <Response>(response: Response): Response =>
  JSON.parse(
    JSON.stringify(response, (_key, value) =>
      value === null ? undefined : value,
    ),
  );

/**
 * Runs one passkey ceremony, turning its failures into MFA errors the flow
 * knows: a dismissed sheet can be retried in place, a passkey already in
 * the password manager has its own screen, anything else shows "Couldn't use
 * your passkey".
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
    if (isCancellation(error)) {
      throw new MfaFlowError('passkey_ceremony_cancelled');
    }
    if (isExcludedCredential(error)) {
      throw new MfaFlowError('passkey_already_exists');
    }
    // The flow only shows "Couldn't use your passkey"; keep the cause (for
    // example a misconfigured association) for debugging and Sentry.
    Logger.error(error as Error, {
      tags: { feature: 'mfa', mfaCode: failure },
    });
    throw new MfaFlowError(failure);
  }
  if (!response) {
    throw new MfaFlowError(failure);
  }
  return withoutNulls(response);
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
