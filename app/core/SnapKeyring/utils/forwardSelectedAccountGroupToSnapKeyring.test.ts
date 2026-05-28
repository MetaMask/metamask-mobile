import { forwardSelectedAccountGroupToSnapKeyring } from './forwardSelectedAccountGroupToSnapKeyring';
import Logger from '../../../util/Logger';

jest.mock('../../../util/Logger', () => ({
  error: jest.fn(),
}));

const mockGetAccountGroupObject = jest.fn();
const mockGetSnapKeyring = jest.fn();

const mockSnapKeyring = {
  setSelectedAccounts: jest.fn(),
};

jest.mock('../../Engine', () => ({
  getSnapKeyring: () => mockGetSnapKeyring(),
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSnapKeyring.mockReturnValue(mockSnapKeyring);
  });

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

  it('does not call SnapKeyring.setSelectedAccountGroup if group has no accounts', async () => {
    mockGetAccountGroupObject.mockReturnValue({
      ...mockAccountGroup,
      accounts: [],
    });
    await forwardSelectedAccountGroupToSnapKeyring(mockAccountGroup.id);

    expect(mockSnapKeyring.setSelectedAccounts).not.toHaveBeenCalled();
  });

  it('logs and swallows errors from getSnapKeyring', async () => {
    const error = new Error('snap keyring not ready');
    mockGetAccountGroupObject.mockReturnValue(mockAccountGroup);
    mockGetSnapKeyring.mockImplementation(() => {
      throw error;
    });

    await expect(
      forwardSelectedAccountGroupToSnapKeyring(mockAccountGroup.id),
    ).resolves.toBeUndefined();
    expect(Logger.error).toHaveBeenCalledWith(
      error,
      'forwardSelectedAccountGroupToSnapKeyring failed',
    );
  });
});
