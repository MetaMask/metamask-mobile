import type { Identifier } from '@metamask/mfa-recovery-controller';
import type { MfaMethod } from '../../util/identity/mfa/engine/types';
import { MfaRecoveryService } from '../Engine/controllers/mfa-recovery-controller/services/mfa-recovery-service';
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

/**
 * Keeps passwordless recovery in step with a newly enrolled method. Sets
 * recovery up on first enrollment, linking the social login first when Auth
 * does not have it; afterwards, adds a newly enrolled passkey to Cubist when
 * Cubist does not have one yet.
 *
 * @param method - The method that was just enrolled.
 * @param options - How to prove the user and pick the social link email.
 */
export async function syncRecoveryAfterEnroll(
  method: MfaMethod,
  { verifyMfa, getSocialLinkEmail }: SyncRecoveryAfterEnrollOptions,
): Promise<void> {
  const service = new MfaRecoveryService({
    verifyMfa,
    approvalOperation: PASSWORDLESS_RECOVERY_SETUP_OPERATION,
    getSocialLinkEmail,
  });

  if (service.getStatus() === 'NotEnabled') {
    const candidates = await service.getCandidateIdentifiers();
    const identifiers = Object.values(candidates).filter(
      (identifier): identifier is Identifier => identifier !== undefined,
    );
    await service.setUp(identifiers);
    return;
  }

  if (method !== 'passkey') {
    return;
  }

  const { identifiers } = await service.mfaRecoveryController.getIdentifiers();
  if (identifiers.some((identifier) => identifier.type === 'passkey')) {
    return;
  }

  const { passkey } = await service.getCandidateIdentifiers();
  if (passkey) {
    await service.addIdentifier(passkey);
  }
}
