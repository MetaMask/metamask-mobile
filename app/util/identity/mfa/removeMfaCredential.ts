import type {
  EnrolledCredential,
  TokenReason,
} from '@metamask/profile-sync-controller/sdk';
import Engine from '../../../core/Engine';
import Logger from '../../Logger';

/**
 * Removes one of the profile's methods and caches the ones left. It needs a
 * verification from `verifyOrEnroll` with another type of method: the server
 * refuses one with the same type, and the last method.
 *
 * For passkeys, removes the credential from Auth first so an Auth failure
 * never permanently untrusts a still-live passkey, then stops trusting it in
 * MFA recovery (best-effort) so a later approval cannot add it back.
 *
 * @param credential - The method to remove.
 * @param reason - The operation, for tracing.
 */
export const removeMfaCredential = async (
  credential: EnrolledCredential,
  reason: TokenReason,
): Promise<void> => {
  await Engine.context.AuthenticationController.removeCredential({
    credentialId: credential.id,
    reason,
  });
  if (credential.type === 'passkey') {
    try {
      await Engine.context.MfaRecoveryController.untrustPasskey(credential.id);
    } catch (error) {
      Logger.error(
        error instanceof Error
          ? error
          : new Error('Failed to untrust removed passkey in MFA recovery'),
        { tags: { feature: 'mfa', operation: reason.operation } },
      );
    }
  }
};
