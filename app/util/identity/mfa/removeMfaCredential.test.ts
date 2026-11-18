import Engine from '../../../core/Engine';
import { forgetPendingPasskey } from '../../../core/MfaRecovery/trustPasskey';
import { removeMfaCredential } from './removeMfaCredential';

jest.mock('../../../core/MfaRecovery/trustPasskey', () => ({
  forgetPendingPasskey: jest.fn(),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    AuthenticationController: { removeCredential: jest.fn() },
    MfaRecoveryController: { untrustPasskey: jest.fn() },
  },
}));

const removeCredential = jest.mocked(
  Engine.context.AuthenticationController.removeCredential,
);
const untrustPasskey = jest.mocked(
  Engine.context.MfaRecoveryController.untrustPasskey,
);

describe('removeMfaCredential', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    removeCredential.mockResolvedValue([]);
  });

  it('removes the method by its id', async () => {
    await removeMfaCredential(
      { id: 'totp', type: 'totp', status: 'active' },
      { operation: 'settings.removeAuthenticatorApp' },
    );

    expect(removeCredential).toHaveBeenCalledWith({
      credentialId: 'totp',
      reason: { operation: 'settings.removeAuthenticatorApp' },
    });
    expect(untrustPasskey).not.toHaveBeenCalled();
    expect(forgetPendingPasskey).not.toHaveBeenCalled();
  });

  it('stops trusting a passkey before removing it', async () => {
    untrustPasskey.mockRejectedValue(new Error('offline'));

    await expect(
      removeMfaCredential(
        { id: 'cred', type: 'passkey', status: 'active' },
        { operation: 'settings.removePasskey' },
      ),
    ).rejects.toThrow('offline');

    expect(forgetPendingPasskey).toHaveBeenCalledWith('cred');
    expect(untrustPasskey).toHaveBeenCalledWith('cred');
    expect(removeCredential).not.toHaveBeenCalled();
  });
});
