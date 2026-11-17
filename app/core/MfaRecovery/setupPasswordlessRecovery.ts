import { getMfaRecoveryErrorCode } from '../Engine/controllers/mfa-recovery-controller/errors';
import { IdentifierNotApprovedError } from '../Engine/controllers/mfa-recovery-controller/services/mfa-recovery-service';
import { LinkSocialLoginError } from '../Engine/controllers/mfa-recovery-controller/social-login/link-social-login';
import { createMfaRecoveryService } from './engineBindings';
import { redactForDisplay } from './redactForDisplay';

/** Operation named on the Auth approvals this setup requests. */
export const PASSWORDLESS_RECOVERY_SETUP_OPERATION =
  'wallet.passwordless_recovery_setup';

export type PasswordlessRecoverySetupResult = 'already_enabled' | 'enabled';

/** A failed setup. Carries no token, secret, or password. */
export class PasswordlessRecoverySetupError extends Error {
  readonly code: string;

  /** Non-secret hint, such as which identifier kinds Auth approved. */
  readonly detail?: string;

  constructor(code: string, detail?: string) {
    super(`Passwordless recovery setup failed: ${code}`);
    this.name = 'PasswordlessRecoverySetupError';
    this.code = code;
    this.detail = detail;
  }
}

/**
 * Prepares the unlocked social wallet so passwordless recovery can open it.
 *
 * Registers one recovery secret at Cubist for the primary account (SIWE), the
 * social login and the enrolled passkey, then seals the seed phrases so that
 * secret can open them.
 * The current password still unlocks the wallet. Does nothing when the vault
 * is already sealed.
 *
 * @param verifyMfa - Proves a factor so the setup approvals are accepted.
 * @returns Whether setup ran or the vault was already prepared.
 */
export async function setupPasswordlessRecovery(
  verifyMfa: () => Promise<void>,
): Promise<PasswordlessRecoverySetupResult> {
  const service = createMfaRecoveryService({
    verifyMfa,
    approvalOperation: PASSWORDLESS_RECOVERY_SETUP_OPERATION,
  });
  if (service.getStatus() === 'Enabled') {
    return 'already_enabled';
  }

  try {
    const { passkeyIdentifier } = await service.prepareRun();
    return await service.setUp([passkeyIdentifier]);
  } catch (error) {
    throw toSetupError(error);
  }
}

function toSetupError(error: unknown): PasswordlessRecoverySetupError {
  if (error instanceof PasswordlessRecoverySetupError) {
    return error;
  }
  const passkeyNotApproved =
    error instanceof IdentifierNotApprovedError &&
    error.identifierType === 'passkey';
  return new PasswordlessRecoverySetupError(
    passkeyNotApproved
      ? 'passkey_not_enrolled'
      : getMfaRecoveryErrorCode(error),
    error instanceof LinkSocialLoginError
      ? error.detail
      : describeFailure(error),
  );
}

/** Names the error, with secrets removed. */
function describeFailure(error: unknown): string {
  const name = error instanceof Error ? error.name : typeof error;
  const message = error instanceof Error ? error.message : '';
  return message ? `${name}: ${redactForDisplay(message)}` : name;
}
