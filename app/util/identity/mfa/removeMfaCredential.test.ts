import Engine from '../../../core/Engine';
import { removeMfaCredential } from './removeMfaCredential';

jest.mock('../../../core/Engine', () => ({
  context: {
    AuthenticationController: { removeCredential: jest.fn() },
  },
}));

describe('removeMfaCredential', () => {
  it('removes the method by its id', async () => {
    const removeCredential = jest.mocked(
      Engine.context.AuthenticationController.removeCredential,
    );
    removeCredential.mockResolvedValue([]);

    await removeMfaCredential(
      { id: 'totp', type: 'totp', status: 'active' },
      { operation: 'settings.removeAuthenticatorApp' },
    );

    expect(removeCredential).toHaveBeenCalledWith({
      credentialId: 'totp',
      reason: { operation: 'settings.removeAuthenticatorApp' },
    });
  });
});
