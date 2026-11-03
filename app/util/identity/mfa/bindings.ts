import Engine from '../../../core/Engine';
import type { MfaControllerAdapter } from './engine/types';
import { listEnrolledCredentialsWithSocialSession } from './socialProfileSession';

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
  // Draft: W3A/social JWT → profile access token → list factors (pre-unlock).
  listEnrolledCredentialsWithSocialSession,
};
