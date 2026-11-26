import type { MfaMethod } from '../../util/identity/mfa/engine/types';
import { createMfaRecoveryService } from './engineBindings';

/** Operation named on the Auth approvals recovery setup and updates request. */
export const PASSWORDLESS_RECOVERY_SETUP_OPERATION =
  'wallet.passwordless_recovery_setup';

export interface SyncRecoveryAfterEnrollOptions {
  /** Proves the user so the recovery approvals are accepted. */
  verifyMfa: () => Promise<void>;
}

export type RemovePasskeyFromRecoveryOptions = Pick<
  SyncRecoveryAfterEnrollOptions,
  'verifyMfa'
>;

/**
 * Keeps passwordless recovery in step with a newly enrolled method. Sets
 * recovery up on first enrollment; afterwards, adds each passkey Auth approved
 * that Cubist does not have yet.
 *
 * @param method - The method that was just enrolled.
 * @param options - How to prove the user.
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
    await service.setUp();
    return;
  }

  if (method !== 'passkey') {
    return;
  }

  const unenrolledPasskeys = await service.getUnenrolledPasskeyIdentifiers();
  // Each addIdentifier acquires the recovery lock and advances the Cubist
  // epoch, so passkeys must be added sequentially rather than with Promise.all.
  await unenrolledPasskeys.reduce<Promise<void>>(
    async (previous, passkey): Promise<void> => {
      await previous;
      await service.addIdentifier(passkey);
    },
    Promise.resolve(),
  );
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
