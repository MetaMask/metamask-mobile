import { forwardSelectedAccountGroupToSnapKeyring } from './forwardSelectedAccountGroupToSnapKeyring';

const mockGetAccountGroupObject = jest.fn();

const mockSnapKeyring = {
  setSelectedAccounts: jest.fn(),
};

jest.mock('../../Engine', () => ({
  getSnapKeyring: () => mockSnapKeyring,
  context: {
    AccountTreeController: {
      getAccountGroupObject: () => mockGetAccountGroupObject(),
    },
  },
}));

describe('forwardSelectedAccountGroupToSnapKeyring', () => {
  const mockAccountGroup = {
    id: 'entropy:source/mock-group-id-1' as const,
    accounts: ['mock-id-1', 'mock-id-2'],
  };

  it('does not call SnapKeyring.setSelectedAccountGroup if no group is selected', async () => {
    await forwardSelectedAccountGroupToSnapKeyring('');

    expect(mockSnapKeyring.setSelectedAccounts).not.toHaveBeenCalled();
  });

  it('does not call SnapKeyring.setSelectedAccountGroup if group object cannot be found', async () => {
    mockGetAccountGroupObject.mockReturnValue(undefined);
    await forwardSelectedAccountGroupToSnapKeyring(mockAccountGroup.id);

    expect(mockSnapKeyring.setSelectedAccounts).not.toHaveBeenCalled();
  });

  it('calls SnapKeyring.setSelectedAccountGroup if group is valid', async () => {
    mockGetAccountGroupObject.mockReturnValue(mockAccountGroup);
    await forwardSelectedAccountGroupToSnapKeyring(mockAccountGroup.id);

    expect(mockSnapKeyring.setSelectedAccounts).toHaveBeenCalledWith(
      mockAccountGroup.accounts,
    );
  });
});
