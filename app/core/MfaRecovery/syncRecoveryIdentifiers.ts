import type { MfaMethod } from '../../util/identity/mfa/engine/types';
import { createMfaRecoveryService } from './engineBindings';
import { PASSWORDLESS_RECOVERY_SETUP_OPERATION } from './setupPasswordlessRecovery';

export interface SyncRecoveryAfterEnrollOptions {
  /** Proves the user so the recovery approvals are accepted. */
  verifyMfa: () => Promise<void>;
  /**
   * Asks for the email to link the social login with, when it is not linked
   * yet. `undefined` links with the social token's own email.
   */
  getSocialLinkEmail?: () => Promise<string | undefined>;
}

export type RemovePasskeyFromRecoveryOptions = Pick<
  SyncRecoveryAfterEnrollOptions,
  'verifyMfa'
>;

/**
 * Keeps passwordless recovery in step with a newly enrolled method. Sets
 * recovery up on first enrollment, linking the social login first when Auth
 * does not have it; afterwards, adds each passkey Auth approved that Cubist
 * does not have yet.
 *
 * @param method - The method that was just enrolled.
 * @param options - How to prove the user and pick the social link email.
 */
export async function syncRecoveryAfterEnroll(
  method: MfaMethod,
  options: SyncRecoveryAfterEnrollOptions,
): Promise<void> {
  const service = createMfaRecoveryService({
    ...options,
    approvalOperation: PASSWORDLESS_RECOVERY_SETUP_OPERATION,
  });

  if (service.getStatus() === 'NotEnabled') {
    await service.setUp(await service.getCandidateIdentifiers());
    return;
  }

  if (method !== 'passkey') {
    return;
  }

  for (const passkey of await service.getUnenrolledPasskeyIdentifiers()) {
    await service.addIdentifier(passkey);
  }
}

/**
 * Removes a passkey from Cubist before it is removed from Auth. Cubist must
 * drop it first: once Auth no longer approves it, escrows reject any later
 * identifier update that still lists it. Does nothing when recovery is not set
 * up or Cubist does not have the passkey.
 *
 * @param credentialId - The WebAuthn credential ID of the passkey.
 * @param options - How to prove the user.
 */
export async function removePasskeyFromRecovery(
  credentialId: string,
  { verifyMfa }: RemovePasskeyFromRecoveryOptions,
): Promise<void> {
  const service = createMfaRecoveryService({
    verifyMfa,
    approvalOperation: PASSWORDLESS_RECOVERY_SETUP_OPERATION,
  });

  if (service.getStatus() === 'NotEnabled') {
    return;
  }

  const passkey = await service.findEnrolledPasskeyIdentifier(credentialId);
  if (passkey) {
    await service.removeIdentifier(passkey);
  }
}
