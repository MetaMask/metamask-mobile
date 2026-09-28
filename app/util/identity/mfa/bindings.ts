import Engine from '../../../core/Engine';
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
  getVerificationToken: (request) =>
    Engine.context.AuthenticationController.getVerificationToken(request),
  clearVerificationSession: () =>
    Engine.context.AuthenticationController.clearVerificationSession(),
};
