import Engine from '../../../core/Engine';
import { mobileMfaControllerAdapter } from './bindings';

jest.mock('../../../core/Engine', () => ({
  context: {
    AuthenticationController: {
      refreshEnrolledCredentials: jest.fn(),
      beginCredentialEnrollment: jest.fn(),
      completeCredentialEnrollment: jest.fn(),
      beginCredentialVerification: jest.fn(),
      completeCredentialVerification: jest.fn(),
      getVerificationToken: jest.fn(),
      clearVerificationSession: jest.fn(),
    },
  },
}));

const controller = jest.mocked(Engine.context.AuthenticationController);
const reason = { operation: 'test' };

describe('mobileMfaControllerAdapter', () => {
  it('forwards refreshEnrolledCredentials', async () => {
    controller.refreshEnrolledCredentials.mockResolvedValue([]);

    expect(
      await mobileMfaControllerAdapter.refreshEnrolledCredentials(),
    ).toStrictEqual([]);
  });

  it('forwards beginCredentialEnrollment with its request', async () => {
    const request = { type: 'email_otp' as const, email: 'a@b.co', reason };
    await mobileMfaControllerAdapter.beginCredentialEnrollment(request);

    expect(controller.beginCredentialEnrollment).toHaveBeenCalledWith(request);
  });

  it('forwards completeCredentialEnrollment with its request', async () => {
    const request = {
      flowId: 'flow',
      proof: { type: 'email_otp' as const, code: '123456' },
      reason,
    };
    await mobileMfaControllerAdapter.completeCredentialEnrollment(request);

    expect(controller.completeCredentialEnrollment).toHaveBeenCalledWith(
      request,
    );
  });

  it('forwards beginCredentialVerification with its request', async () => {
    const request = { type: 'passkey' as const, reason };
    await mobileMfaControllerAdapter.beginCredentialVerification(request);

    expect(controller.beginCredentialVerification).toHaveBeenCalledWith(
      request,
    );
  });

  it('forwards completeCredentialVerification with its request', async () => {
    const request = {
      flowId: 'flow',
      proof: { type: 'email_otp' as const, code: '123456' },
      reason,
    };
    await mobileMfaControllerAdapter.completeCredentialVerification(request);

    expect(controller.completeCredentialVerification).toHaveBeenCalledWith(
      request,
    );
  });

  it('forwards getVerificationToken with its request', async () => {
    controller.getVerificationToken.mockReturnValue(null);

    expect(
      await mobileMfaControllerAdapter.getVerificationToken({
        maxSessionAgeMs: 1000,
      }),
    ).toBeNull();
    expect(controller.getVerificationToken).toHaveBeenCalledWith({
      maxSessionAgeMs: 1000,
    });
  });

  it('forwards clearVerificationSession', async () => {
    await mobileMfaControllerAdapter.clearVerificationSession();

    expect(controller.clearVerificationSession).toHaveBeenCalled();
  });
});
