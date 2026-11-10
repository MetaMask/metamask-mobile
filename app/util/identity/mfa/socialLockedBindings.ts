import Engine from '../../../core/Engine';
import type {
  BeginEnrollmentRequest,
  CompleteEnrollmentRequest,
  CompleteVerificationRequest,
  GetVerificationTokenRequest,
  VerificationToken,
} from '@metamask/profile-sync-controller/sdk';
import type { MfaControllerAdapter } from './engine/types';

/**
 * Locked-wallet MFA adapter for social recovery.
 *
 * Maps kit calls onto `refreshSocialLoginCredentials` /
 * `beginSocialLoginVerification` / `completeSocialLoginVerification`. Those
 * APIs require the vault to stay locked and do not persist a verification
 * session — we cache the token from `complete` so `getVerificationToken`
 * can finish the kit plan without calling the unlocked session getter.
 *
 * Enrollment is refused: locked recovery is verify-only.
 */
export const createSocialLockedMfaControllerAdapter =
  (): MfaControllerAdapter => {
    let cachedToken: VerificationToken | null = null;

    const refuseEnrollment = async (
      _request: BeginEnrollmentRequest | CompleteEnrollmentRequest,
    ): Promise<never> => {
      throw new Error(
        'MFA enrollment is not available while the social wallet is locked',
      );
    };

    return {
      refreshEnrolledCredentials: () =>
        Engine.context.AuthenticationController.refreshSocialLoginCredentials(),

      beginCredentialEnrollment: refuseEnrollment,
      completeCredentialEnrollment: refuseEnrollment,

      beginCredentialVerification: (request) =>
        Engine.context.AuthenticationController.beginSocialLoginVerification(
          request,
        ),

      completeCredentialVerification: async (
        request: CompleteVerificationRequest,
      ) => {
        const token =
          await Engine.context.AuthenticationController.completeSocialLoginVerification(
            request,
          );
        cachedToken = token;
        return token;
      },

      getVerificationToken: async (
        _request?: GetVerificationTokenRequest,
      ): Promise<VerificationToken | null> => cachedToken,

      clearVerificationSession: async () => {
        cachedToken = null;
      },
    };
  };
