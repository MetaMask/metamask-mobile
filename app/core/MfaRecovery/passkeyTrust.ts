import type {
  CompleteEnrollmentRequest,
  EnrolledCredential,
} from '@metamask/profile-sync-controller/sdk';
import Engine from '../Engine';
import Logger from '../../util/Logger';

/**
 * Stops trusting a passkey in MFA recovery on a best-effort basis, logging any
 * failure without throwing so callers can preserve their primary outcome.
 *
 * @param credentialId - The WebAuthn credential ID of the passkey.
 * @param operation - The MFA operation tag for error reporting.
 */
export async function untrustPasskeyBestEffort(
  credentialId: string,
  operation: string,
): Promise<void> {
  try {
    await Engine.context.MfaRecoveryController.untrustPasskey(credentialId);
  } catch (error) {
    Logger.error(
      error instanceof Error
        ? error
        : new Error('Failed to untrust passkey in MFA recovery'),
      { tags: { feature: 'mfa', operation } },
    );
  }
}

/**
 * Trusts a newly created passkey attestation in MFA recovery before Auth
 * enrolls it, and rolls back trust if Auth subsequently rejects enrollment.
 *
 * WebAuthn attestation is only emitted at creation, so failing before Auth
 * enrollment lets the MFA flow offer a retry instead of enrolling an
 * unrecoverable passkey. Non-passkey requests pass straight through.
 *
 * @param request - The credential enrollment completion request.
 * @param completeEnrollment - Performs the Auth enrollment call.
 * @returns The enrolled credentials returned by Auth.
 */
export async function withPasskeyRecoveryTrust(
  request: CompleteEnrollmentRequest,
  completeEnrollment: () => Promise<EnrolledCredential[]>,
): Promise<EnrolledCredential[]> {
  if (request.proof.type !== 'passkey') {
    return await completeEnrollment();
  }

  await Engine.context.MfaRecoveryController.trustIdentifier({
    type: 'passkey',
    attestationObject: request.proof.attestation.response.attestationObject,
  });
  try {
    return await completeEnrollment();
  } catch (error) {
    await untrustPasskeyBestEffort(
      request.proof.attestation.id,
      request.reason.operation,
    );
    throw error;
  }
}
