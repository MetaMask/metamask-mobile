import Engine from '../../../core/Engine';
import Logger from '../../Logger';
import { removeMfaCredential } from './removeMfaCredential';

jest.mock('../../../core/Engine', () => ({
  context: {
    AuthenticationController: { removeCredential: jest.fn() },
    MfaRecoveryController: { untrustPasskey: jest.fn() },
  },
}));

jest.mock('../../Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

describe('removeMfaCredential', () => {
  const removeCredential = jest.mocked(
    Engine.context.AuthenticationController.removeCredential,
  );
  const untrustPasskey = jest.mocked(
    Engine.context.MfaRecoveryController.untrustPasskey,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    removeCredential.mockResolvedValue([]);
    untrustPasskey.mockResolvedValue(undefined);
  });

  it('removes a non-passkey method by its id without calling untrustPasskey', async () => {
    await removeMfaCredential(
      { id: 'totp', type: 'totp', status: 'active' },
      { operation: 'settings.removeAuthenticatorApp' },
    );

    expect(untrustPasskey).not.toHaveBeenCalled();
    expect(removeCredential).toHaveBeenCalledWith({
      credentialId: 'totp',
      reason: { operation: 'settings.removeAuthenticatorApp' },
    });
  });

  it('removes a passkey from Auth before untrusting it', async () => {
    const order: string[] = [];
    removeCredential.mockImplementationOnce(async () => {
      order.push('remove');
      return [];
    });
    untrustPasskey.mockImplementationOnce(async () => {
      order.push('untrust');
    });

    await removeMfaCredential(
      { id: 'passkey-cred-id', type: 'passkey', status: 'active' },
      { operation: 'settings.removePasskey' },
    );

    expect(order).toStrictEqual(['remove', 'untrust']);
    expect(removeCredential).toHaveBeenCalledWith({
      credentialId: 'passkey-cred-id',
      reason: { operation: 'settings.removePasskey' },
    });
    expect(untrustPasskey).toHaveBeenCalledWith('passkey-cred-id');
  });

  it('does not untrust the passkey if Auth removal fails', async () => {
    const error = new Error('auth remove failed');
    removeCredential.mockRejectedValueOnce(error);

    await expect(
      removeMfaCredential(
        { id: 'passkey-cred-id', type: 'passkey', status: 'active' },
        { operation: 'settings.removePasskey' },
      ),
    ).rejects.toBe(error);
    expect(untrustPasskey).not.toHaveBeenCalled();
  });

  it('logs and resolves if untrusting fails after Auth already removed the passkey', async () => {
    const untrustError = new Error('storage unavailable');
    untrustPasskey.mockRejectedValueOnce(untrustError);

    await expect(
      removeMfaCredential(
        { id: 'passkey-cred-id', type: 'passkey', status: 'active' },
        { operation: 'settings.removePasskey' },
      ),
    ).resolves.toBeUndefined();
    expect(Logger.error).toHaveBeenCalledWith(untrustError, {
      tags: { feature: 'mfa', operation: 'settings.removePasskey' },
    });
  });
});
