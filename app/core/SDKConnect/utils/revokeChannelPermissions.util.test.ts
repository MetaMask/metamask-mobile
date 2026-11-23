import Engine from '../../Engine';
import { revokeChannelPermissions } from './revokeChannelPermissions.util';

jest.mock('../../Engine', () => ({
  context: {
    PermissionController: {
      getPermissions: jest.fn(),
      revokeAllPermissions: jest.fn(),
    },
  },
}));

describe('revokeChannelPermissions', () => {
  const { getPermissions, revokeAllPermissions } = (
    Engine.context as unknown as {
      PermissionController: {
        getPermissions: jest.Mock;
        revokeAllPermissions: jest.Mock;
      };
    }
  ).PermissionController;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('revokes every permission when the channel has permissions', () => {
    getPermissions.mockReturnValue({ eth_accounts: {} });

    revokeChannelPermissions('channel1');

    expect(revokeAllPermissions).toHaveBeenCalledWith('channel1');
  });

  it('does nothing when the channel has no permissions', () => {
    getPermissions.mockReturnValue(undefined);

    revokeChannelPermissions('channel1');

    expect(revokeAllPermissions).not.toHaveBeenCalled();
  });

  it('throws when the revoke fails', () => {
    getPermissions.mockReturnValue({ eth_accounts: {} });
    revokeAllPermissions.mockImplementationOnce(() => {
      throw new Error('revoke failed');
    });

    expect(() => revokeChannelPermissions('channel1')).toThrow('revoke failed');
  });
});
