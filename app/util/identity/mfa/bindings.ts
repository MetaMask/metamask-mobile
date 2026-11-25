import type {
  GetVerificationTokenRequest,
  VerificationToken,
} from '@metamask/profile-sync-controller/sdk';
import Engine from '../../../core/Engine';
import { MfaFlowError } from './engine/errors';
import type { MfaControllerAdapter } from './engine/types';

export const mobileMfaControllerAdapter: MfaControllerAdapter = {
  refreshEnrolledCredentials: () =>
    Engine.context.AuthenticationController.refreshEnrolledCredentials(),
  beginCredentialEnrollment: (request) =>
    Engine.context.AuthenticationController.beginCredentialEnrollment(request),
  completeCredentialEnrollment: (request) =>
    Engine.context.AuthenticationController.completeCredentialEnrollment(
      request,
    ),
  beginCredentialVerification: (request) =>
    Engine.context.AuthenticationController.beginCredentialVerification(
      request,
    ),
  completeCredentialVerification: (request) =>
    Engine.context.AuthenticationController.completeCredentialVerification(
      request,
    ),
  getVerificationToken: async (request) =>
    Engine.context.AuthenticationController.getVerificationToken(request),
  clearVerificationSession: async () =>
    Engine.context.AuthenticationController.clearVerificationSession(),
};

/**
 * Holds the verification token a flow earns while the wallet is locked, in
 * memory only. The controller opens no session then, but the flow asks for the
 * token after each proof to know whether it is done: without one it would
 * start the verification again and send a new code.
 *
 * @returns The cache, with the same expiry rules as the controller's session.
 */
const createVerificationTokenCache = () => {
  let token: VerificationToken | null = null;
  return {
    remember: (value: VerificationToken) => {
      token = value;
      return value;
    },
    get: ({ maxSessionAgeMs }: GetVerificationTokenRequest = {}) => {
      if (!token) {
        return null;
      }
      const now = Date.now();
      if (now >= token.obtainedAt + token.expiresIn * 1000) {
        return null;
      }
      // `>=` so a zero max age always forces a fresh verification.
      if (
        maxSessionAgeMs !== undefined &&
        now - token.obtainedAt >= maxSessionAgeMs
      ) {
        return null;
      }
      return token;
    },
    clear: () => {
      token = null;
    },
  };
};

/**
 * Creates the adapter for social-login wallet recovery, while the wallet is
 * still locked. Verification goes through the locked-only controller methods,
 * which fetch the social token themselves and never store a verification
 * session, so the adapter keeps the token of its own flow in memory: create one
 * per flow. Enrollment is unreachable here: the flow it serves never plans one.
 *
 * @returns A new adapter with an empty token cache.
 */
export const createSocialLoginControllerAdapter = (): MfaControllerAdapter => {
  const cache = createVerificationTokenCache();
  return {
    refreshEnrolledCredentials: () =>
      Engine.context.AuthenticationController.refreshSocialLoginCredentials(),
    beginCredentialEnrollment: () =>
      Promise.reject(new MfaFlowError('invalid_request')),
    completeCredentialEnrollment: () =>
      Promise.reject(new MfaFlowError('invalid_request')),
    beginCredentialVerification: (request) =>
      Engine.context.AuthenticationController.beginSocialLoginVerification(
        request,
      ),
    completeCredentialVerification: async (request) =>
      cache.remember(
        await Engine.context.AuthenticationController.completeSocialLoginVerification(
          request,
        ),
      ),
    getVerificationToken: async (request) => cache.get(request),
    clearVerificationSession: async () => cache.clear(),
  };
};
