import Engine from '../../../core/Engine';
import { removeMfaCredential } from './removeMfaCredential';

jest.mock('../../../core/Engine', () => ({
  context: {
    AuthenticationController: { removeCredential: jest.fn() },
    MfaRecoveryController: { untrustPasskey: jest.fn() },
  },
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

  it('untrusts a passkey before removing it from Auth', async () => {
    const order: string[] = [];
    untrustPasskey.mockImplementationOnce(async () => {
      order.push('untrust');
    });
    removeCredential.mockImplementationOnce(async () => {
      order.push('remove');
      return [];
    });

    await removeMfaCredential(
      { id: 'passkey-cred-id', type: 'passkey', status: 'active' },
      { operation: 'settings.removePasskey' },
    );

    expect(order).toStrictEqual(['untrust', 'remove']);
    expect(untrustPasskey).toHaveBeenCalledWith('passkey-cred-id');
    expect(removeCredential).toHaveBeenCalledWith({
      credentialId: 'passkey-cred-id',
      reason: { operation: 'settings.removePasskey' },
    });
  });

  it('does not remove the passkey from Auth if untrusting fails', async () => {
    const error = new Error('untrust failed');
    untrustPasskey.mockRejectedValueOnce(error);

    await expect(
      removeMfaCredential(
        { id: 'passkey-cred-id', type: 'passkey', status: 'active' },
        { operation: 'settings.removePasskey' },
      ),
    ).rejects.toBe(error);
    expect(removeCredential).not.toHaveBeenCalled();
  });
});
