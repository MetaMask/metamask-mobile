import { toggleBasicFunctionality, setBasicFunctionality } from './index';

// Mock the remote feature flag module
const mockIsMultichainAccountsState2Enabled = jest.fn();
jest.mock('../../multichain-accounts/remote-feature-flag', () => ({
  isMultichainAccountsState2Enabled: mockIsMultichainAccountsState2Enabled,
}));

// Mock Engine
const mockSetBasicFunctionality = jest.fn().mockResolvedValue(undefined);
jest.mock('../../core/Engine', () => ({
  default: {
    context: {
      MultichainAccountService: {
        setBasicFunctionality: mockSetBasicFunctionality,
      },
    },
  },
}));

describe('toggleBasicFunctionality action', () => {
  let mockDispatch;

  beforeEach(() => {
    mockDispatch = jest.fn();
    jest.clearAllMocks();
  });

  it('does not call MultichainAccountService when State 2 is disabled', async () => {
    // Mock State 2 as disabled
    mockIsMultichainAccountsState2Enabled.mockReturnValue(false);

    const action = toggleBasicFunctionality(true);
    await action(mockDispatch);

    // Verify Redux state is still updated
    expect(mockDispatch).toHaveBeenCalledWith(setBasicFunctionality(true));

    // Verify MultichainAccountService was NOT called
    expect(mockSetBasicFunctionality).not.toHaveBeenCalled();

    // Verify feature flag was checked
    expect(mockIsMultichainAccountsState2Enabled).toHaveBeenCalled();
  });

  it('calls MultichainAccountService when State 2 is enabled', async () => {
    // Mock State 2 as enabled
    mockIsMultichainAccountsState2Enabled.mockReturnValue(true);

    const action = toggleBasicFunctionality(true);
    await action(mockDispatch);

    // Verify Redux state is updated
    expect(mockDispatch).toHaveBeenCalledWith(setBasicFunctionality(true));

    // Verify MultichainAccountService WAS called
    expect(mockSetBasicFunctionality).toHaveBeenCalledWith(true);

    // Verify feature flag was checked
    expect(mockIsMultichainAccountsState2Enabled).toHaveBeenCalled();
  });

  it('handles MultichainAccountService errors gracefully when State 2 is enabled', async () => {
    // Mock State 2 as enabled
    mockIsMultichainAccountsState2Enabled.mockReturnValue(true);

    // Mock MultichainAccountService to throw an error
    const mockError = new Error('Service error');
    mockSetBasicFunctionality.mockRejectedValue(mockError);

    // Spy on console.error
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const action = toggleBasicFunctionality(false);
    await action(mockDispatch);

    // Verify Redux state is still updated despite service error
    expect(mockDispatch).toHaveBeenCalledWith(setBasicFunctionality(false));

    // Verify MultichainAccountService was called
    expect(mockSetBasicFunctionality).toHaveBeenCalledWith(false);

    // Verify error was logged
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to set basic functionality on MultichainAccountService:',
      mockError,
    );

    consoleSpy.mockRestore();
  });
});
