import Engine from '../../../core/Engine';
import {
  createSocialLoginControllerAdapter,
  mobileMfaControllerAdapter,
} from './bindings';
import type { MfaControllerAdapter } from './engine/types';

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
      refreshSocialLoginCredentials: jest.fn(),
      beginSocialLoginVerification: jest.fn(),
      completeSocialLoginVerification: jest.fn(),
    },
  },
}));

const controller = jest.mocked(Engine.context.AuthenticationController);
const reason = { operation: 'qa.test' };

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

describe('createSocialLoginControllerAdapter', () => {
  let socialLoginControllerAdapter: MfaControllerAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    socialLoginControllerAdapter = createSocialLoginControllerAdapter();
  });

  it('forwards refreshEnrolledCredentials to the locked-only refresh', async () => {
    controller.refreshSocialLoginCredentials.mockResolvedValue([]);

    const result =
      await socialLoginControllerAdapter.refreshEnrolledCredentials();

    expect(result).toStrictEqual([]);
    expect(controller.refreshEnrolledCredentials).not.toHaveBeenCalled();
  });

  it('forwards beginCredentialVerification to the social method', async () => {
    const request = { type: 'passkey' as const, reason };

    await socialLoginControllerAdapter.beginCredentialVerification(request);

    expect(controller.beginSocialLoginVerification).toHaveBeenCalledWith(
      request,
    );
    expect(controller.beginCredentialVerification).not.toHaveBeenCalled();
  });

  it('forwards completeCredentialVerification to the social method', async () => {
    const request = {
      flowId: 'flow',
      proof: { type: 'email_otp' as const, code: '123456' },
      reason,
    };

    await socialLoginControllerAdapter.completeCredentialVerification(request);

    expect(controller.completeSocialLoginVerification).toHaveBeenCalledWith(
      request,
    );
    expect(controller.completeCredentialVerification).not.toHaveBeenCalled();
  });

  it('rejects beginCredentialEnrollment', async () => {
    const result = socialLoginControllerAdapter.beginCredentialEnrollment({
      type: 'email_otp',
      email: 'a@b.co',
      reason,
    });

    await expect(result).rejects.toMatchObject({ mfaCode: 'invalid_request' });
    expect(controller.beginCredentialEnrollment).not.toHaveBeenCalled();
  });

  it('rejects completeCredentialEnrollment', async () => {
    const result = socialLoginControllerAdapter.completeCredentialEnrollment({
      flowId: 'flow',
      proof: { type: 'email_otp', code: '123456' },
      reason,
    });

    await expect(result).rejects.toMatchObject({ mfaCode: 'invalid_request' });
    expect(controller.completeCredentialEnrollment).not.toHaveBeenCalled();
  });

  describe('verification token', () => {
    const NOW = 1_800_000_000_000;
    const token = {
      accessToken: 'token',
      expiresIn: 900,
      obtainedAt: NOW,
      claims: { sub: 'profile', amr: ['email_otp'], exp: NOW / 1000 + 900 },
    };
    const completeRequest = {
      flowId: 'flow',
      proof: { type: 'email_otp' as const, code: '123456' },
      reason,
    };
    let nowSpy: jest.SpyInstance<number, []>;

    beforeEach(() => {
      // Created per test: the Jest config may restore spies between tests.
      nowSpy = jest.spyOn(Date, 'now').mockReturnValue(NOW);
      controller.completeSocialLoginVerification.mockResolvedValue(token);
    });

    afterEach(() => {
      nowSpy.mockRestore();
    });

    it('has none before a verification completes', async () => {
      expect(
        await socialLoginControllerAdapter.getVerificationToken(),
      ).toBeNull();
      expect(controller.getVerificationToken).not.toHaveBeenCalled();
    });

    it('returns the token a completed verification earned, without asking the controller', async () => {
      await socialLoginControllerAdapter.completeCredentialVerification(
        completeRequest,
      );

      expect(await socialLoginControllerAdapter.getVerificationToken()).toBe(
        token,
      );
      expect(controller.getVerificationToken).not.toHaveBeenCalled();
      expect(controller.completeSocialLoginVerification).toHaveBeenCalledTimes(
        1,
      );
    });

    it('drops the token once it has expired', async () => {
      await socialLoginControllerAdapter.completeCredentialVerification(
        completeRequest,
      );
      nowSpy.mockReturnValue(NOW + token.expiresIn * 1000);

      expect(
        await socialLoginControllerAdapter.getVerificationToken(),
      ).toBeNull();
    });

    it('applies the caller max session age without dropping the token', async () => {
      await socialLoginControllerAdapter.completeCredentialVerification(
        completeRequest,
      );
      nowSpy.mockReturnValue(NOW + 5000);

      expect(
        await socialLoginControllerAdapter.getVerificationToken({
          maxSessionAgeMs: 5000,
        }),
      ).toBeNull();
      expect(
        await socialLoginControllerAdapter.getVerificationToken({
          maxSessionAgeMs: 5001,
        }),
      ).toBe(token);
    });

    it('forgets the token when the session is cleared', async () => {
      await socialLoginControllerAdapter.completeCredentialVerification(
        completeRequest,
      );

      await socialLoginControllerAdapter.clearVerificationSession();

      expect(
        await socialLoginControllerAdapter.getVerificationToken(),
      ).toBeNull();
      expect(controller.clearVerificationSession).not.toHaveBeenCalled();
    });

    it('does not share a token with another adapter', async () => {
      await socialLoginControllerAdapter.completeCredentialVerification(
        completeRequest,
      );

      expect(
        await createSocialLoginControllerAdapter().getVerificationToken(),
      ).toBeNull();
    });
  });
});
