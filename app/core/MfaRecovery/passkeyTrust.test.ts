import type { CompleteEnrollmentRequest } from '@metamask/profile-sync-controller/sdk';
import Engine from '../Engine';
import Logger from '../../util/Logger';
import {
  untrustPasskeyBestEffort,
  withPasskeyRecoveryTrust,
} from './passkeyTrust';

jest.mock('../Engine', () => ({
  context: {
    MfaRecoveryController: {
      trustIdentifier: jest.fn(),
      untrustPasskey: jest.fn(),
    },
  },
}));

jest.mock('../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const mfaRecoveryController = jest.mocked(Engine.context.MfaRecoveryController);
const reason = { operation: 'qa.test' };

const passkeyRequest: CompleteEnrollmentRequest = {
  flowId: 'flow',
  proof: {
    type: 'passkey',
    attestation: {
      id: 'cred-1',
      rawId: 'cred-1',
      type: 'public-key',
      response: {
        attestationObject: 'YXR0ZXN0YXRpb24',
        clientDataJSON: 'Y2xpZW50',
      },
    },
  },
  reason,
};

describe('withPasskeyRecoveryTrust', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes non-passkey requests through without touching MFA recovery', async () => {
    const enrolled = [
      { id: 'email', type: 'email_otp' as const, status: 'active' as const },
    ];
    const completeEnrollment = jest.fn().mockResolvedValueOnce(enrolled);
    const request: CompleteEnrollmentRequest = {
      flowId: 'flow',
      proof: { type: 'email_otp', code: '123456' },
      reason,
    };

    const result = await withPasskeyRecoveryTrust(request, completeEnrollment);

    expect(result).toBe(enrolled);
    expect(completeEnrollment).toHaveBeenCalledTimes(1);
    expect(mfaRecoveryController.trustIdentifier).not.toHaveBeenCalled();
    expect(mfaRecoveryController.untrustPasskey).not.toHaveBeenCalled();
  });

  it('trusts a newly enrolled passkey attestation before Auth accepts it', async () => {
    const order: string[] = [];
    const enrolled = [
      { id: 'cred-1', type: 'passkey' as const, status: 'active' as const },
    ];
    mfaRecoveryController.trustIdentifier.mockImplementationOnce(async () => {
      order.push('trust');
    });
    const completeEnrollment = jest.fn(async () => {
      order.push('enroll');
      return enrolled;
    });

    const result = await withPasskeyRecoveryTrust(
      passkeyRequest,
      completeEnrollment,
    );

    expect(result).toBe(enrolled);
    expect(order).toStrictEqual(['trust', 'enroll']);
    expect(mfaRecoveryController.trustIdentifier).toHaveBeenCalledWith({
      type: 'passkey',
      attestationObject: 'YXR0ZXN0YXRpb24',
    });
    expect(mfaRecoveryController.untrustPasskey).not.toHaveBeenCalled();
  });

  it('rolls back trusted passkey when Auth enrollment fails', async () => {
    const error = new Error('auth rejected');
    mfaRecoveryController.trustIdentifier.mockResolvedValueOnce(undefined);
    mfaRecoveryController.untrustPasskey.mockResolvedValueOnce(undefined);
    const completeEnrollment = jest.fn().mockRejectedValueOnce(error);

    await expect(
      withPasskeyRecoveryTrust(passkeyRequest, completeEnrollment),
    ).rejects.toBe(error);
    expect(mfaRecoveryController.untrustPasskey).toHaveBeenCalledWith('cred-1');
  });

  it('logs rollback failure and preserves the original Auth error', async () => {
    const authError = new Error('auth rejected');
    const untrustError = new Error('cleanup failed');
    mfaRecoveryController.trustIdentifier.mockResolvedValueOnce(undefined);
    mfaRecoveryController.untrustPasskey.mockRejectedValueOnce(untrustError);
    const completeEnrollment = jest.fn().mockRejectedValueOnce(authError);

    await expect(
      withPasskeyRecoveryTrust(passkeyRequest, completeEnrollment),
    ).rejects.toBe(authError);
    expect(Logger.error).toHaveBeenCalledWith(untrustError, {
      tags: { feature: 'mfa', operation: reason.operation },
    });
  });

  it('fails enrollment without calling Auth if trusting the passkey fails', async () => {
    const trustError = new Error('storage unavailable');
    mfaRecoveryController.trustIdentifier.mockRejectedValueOnce(trustError);
    const completeEnrollment = jest.fn();

    await expect(
      withPasskeyRecoveryTrust(passkeyRequest, completeEnrollment),
    ).rejects.toBe(trustError);
    expect(completeEnrollment).not.toHaveBeenCalled();
    expect(mfaRecoveryController.untrustPasskey).not.toHaveBeenCalled();
  });
});

describe('untrustPasskeyBestEffort', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('untrusts the passkey by credential id', async () => {
    mfaRecoveryController.untrustPasskey.mockResolvedValueOnce(undefined);

    await untrustPasskeyBestEffort('passkey-cred-id', 'settings.removePasskey');

    expect(mfaRecoveryController.untrustPasskey).toHaveBeenCalledWith(
      'passkey-cred-id',
    );
    expect(Logger.error).not.toHaveBeenCalled();
  });

  it('logs and resolves if untrusting fails', async () => {
    const untrustError = new Error('storage unavailable');
    mfaRecoveryController.untrustPasskey.mockRejectedValueOnce(untrustError);

    await expect(
      untrustPasskeyBestEffort('passkey-cred-id', 'settings.removePasskey'),
    ).resolves.toBeUndefined();
    expect(Logger.error).toHaveBeenCalledWith(untrustError, {
      tags: { feature: 'mfa', operation: 'settings.removePasskey' },
    });
  });

  it('wraps non-Error rejections when logging', async () => {
    mfaRecoveryController.untrustPasskey.mockRejectedValueOnce('boom');

    await expect(
      untrustPasskeyBestEffort('passkey-cred-id', 'settings.removePasskey'),
    ).resolves.toBeUndefined();
    expect(Logger.error).toHaveBeenCalledWith(
      new Error('Failed to untrust passkey in MFA recovery'),
      { tags: { feature: 'mfa', operation: 'settings.removePasskey' } },
    );
  });
});
