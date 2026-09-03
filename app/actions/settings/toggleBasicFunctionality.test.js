import {
  toggleBasicFunctionality,
  setBasicFunctionality,
  setBasicFunctionalityConsolidatedEnabled,
} from './index';
import { selectIsBasicFunctionalityConsolidationEnabled } from '../../selectors/featureFlagController/basicFunctionalityConsolidation';
import { syncConsolidatedBasicFunctionalityPreferences } from '../../util/basicFunctionality/syncConsolidatedBasicFunctionalityPreferences';

const mockSyncConsolidatedBasicFunctionalityPreferences = jest.mocked(
  syncConsolidatedBasicFunctionalityPreferences,
);
const mockSelectIsBasicFunctionalityConsolidationEnabled = jest.mocked(
  selectIsBasicFunctionalityConsolidationEnabled,
);

// Mock Engine
const mockSetBasicFunctionality = jest.fn().mockResolvedValue(undefined);
jest.mock('../../core/Engine', () => ({
  default: {
    context: {
      MultichainAccountService: {
        setBasicFunctionality: mockSetBasicFunctionality,
      },
      PreferencesController: {},
    },
  },
}));

jest.mock(
  '../../selectors/featureFlagController/basicFunctionalityConsolidation',
  () => ({
    selectIsBasicFunctionalityConsolidationEnabled: jest.fn(() => false),
  }),
);

jest.mock(
  '../../util/basicFunctionality/syncConsolidatedBasicFunctionalityPreferences',
  () => ({
    syncConsolidatedBasicFunctionalityPreferences: jest.fn(),
  }),
);

describe('toggleBasicFunctionality action', () => {
  let mockDispatch;
  let mockGetState;

  beforeEach(() => {
    mockDispatch = jest.fn();
    mockGetState = jest.fn(() => ({}));
    jest.clearAllMocks();
    mockSelectIsBasicFunctionalityConsolidationEnabled.mockReturnValue(false);
  });

  it('dispatches Redux state update and calls MultichainAccountService', async () => {
    const action = toggleBasicFunctionality(true);
    await action(mockDispatch, mockGetState);

    // Verify Redux state is updated
    expect(mockDispatch).toHaveBeenCalledWith(setBasicFunctionality(true));

    // Verify MultichainAccountService was called
    expect(mockSetBasicFunctionality).toHaveBeenCalledWith(true);
  });

  it('dispatches Redux state update with false value', async () => {
    const action = toggleBasicFunctionality(false);
    await action(mockDispatch, mockGetState);

    // Verify Redux state is updated
    expect(mockDispatch).toHaveBeenCalledWith(setBasicFunctionality(false));

    // Verify MultichainAccountService was called with false
    expect(mockSetBasicFunctionality).toHaveBeenCalledWith(false);
  });

  it('handles MultichainAccountService errors gracefully', async () => {
    // Mock MultichainAccountService to throw an error
    const mockError = new Error('Service error');
    mockSetBasicFunctionality.mockRejectedValue(mockError);

    // Spy on console.error
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const action = toggleBasicFunctionality(false);
    await action(mockDispatch, mockGetState);

    // Verify Redux state is still updated despite service error
    expect(mockDispatch).toHaveBeenCalledWith(setBasicFunctionality(false));

    // Verify MultichainAccountService was called
    expect(mockSetBasicFunctionality).toHaveBeenCalledWith(false);

    // Wait for the promise rejection to be caught
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Verify error was logged
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to set basic functionality on MultichainAccountService:',
      mockError,
    );

    consoleSpy.mockRestore();
  });

  it('syncs consolidated preferences when consolidation is enabled before toggle', async () => {
    mockSelectIsBasicFunctionalityConsolidationEnabled.mockReturnValue(true);
    const action = toggleBasicFunctionality(false);
    await action(mockDispatch, mockGetState);

    expect(mockGetState).toHaveBeenCalled();
    expect(
      mockSelectIsBasicFunctionalityConsolidationEnabled,
    ).toHaveBeenCalledWith({});
    expect(mockDispatch).toHaveBeenCalledWith(
      setBasicFunctionalityConsolidatedEnabled(true),
    );
    expect(
      mockSyncConsolidatedBasicFunctionalityPreferences,
    ).toHaveBeenCalledWith(false);
  });

  it('evaluates consolidation eligibility before flipping BF so silent users still sync', async () => {
    const callOrder = [];
    mockSelectIsBasicFunctionalityConsolidationEnabled.mockImplementation(
      () => {
        callOrder.push('select');
        return true;
      },
    );
    mockDispatch.mockImplementation((action) => {
      callOrder.push(action.type);
      return action;
    });

    const action = toggleBasicFunctionality(false);
    await action(mockDispatch, mockGetState);

    expect(callOrder[0]).toBe('select');
    expect(callOrder).toContain('TOGGLE_BASIC_FUNCTIONALITY');
    expect(callOrder.indexOf('select')).toBeLessThan(
      callOrder.indexOf('TOGGLE_BASIC_FUNCTIONALITY'),
    );
    expect(
      mockSyncConsolidatedBasicFunctionalityPreferences,
    ).toHaveBeenCalledWith(false);
  });

  it('does not sync consolidated preferences when consolidation is disabled', async () => {
    const action = toggleBasicFunctionality(true);
    await action(mockDispatch, mockGetState);

    expect(
      mockSyncConsolidatedBasicFunctionalityPreferences,
    ).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalledWith(
      setBasicFunctionalityConsolidatedEnabled(true),
    );
  });
});
